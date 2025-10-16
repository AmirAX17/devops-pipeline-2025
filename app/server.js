// app/server.js
// ESM module (package.json has "type": "module")

import express from 'express';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

// ---------- App & basic middleware ----------
const app = express();
app.use(express.json());

// ---------- Prometheus metrics setup ----------
const register = new Registry();
collectDefaultMetrics({ register }); // process, event loop, memory, etc.

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10], // sensible web buckets
  registers: [register],
});

// Per-request timing/counters
app.use((req, res, next) => {
  // route label may be the actual route pattern if available, else the path
  const routeLabel = () => (req.route?.path ?? req.path ?? 'unknown');

  const endTimer = httpRequestDurationSeconds.startTimer({
    method: req.method,
    route: 'pending', // final label filled at finish
    status: 'pending',
  });

  const startedAt = Date.now();

  res.on('finish', () => {
    const route = routeLabel();
    const status = String(res.statusCode);

    // Update counter
    httpRequestsTotal.labels(req.method, route, status).inc();

    // Update histogram (override the placeholder labels used at startTimer)
    endTimer({ method: req.method, route, status });

    // Optional: quick dev log
    // console.log(`${req.method} ${route} -> ${status} (${Date.now() - startedAt}ms)`);
  });

  next();
});

// ---------- Simple in-memory cache for AQI ----------
/**
 * cache shape:
 * {
 *   key: 'city:melbourne',
 *   data: {...},          // returned JSON payload
 *   expiry: 1730000000000 // epoch ms
 * }
 */
const aqiCache = new Map();
const CACHE_TTL_MS = 60_000; // 60s

function cacheKeyForCity(cityRaw) {
  const city = String(cityRaw || '').trim().toLowerCase();
  return `city:${city}`;
}

// Fetch AQI-like metrics from OpenAQ (public)
// We'll gather a few parameters if available and present a compact JSON.
// NOTE: We don’t compute the US AQI number; the acceptance asks for “key AQI metrics”.
async function fetchCityAQIMetrics(cityRaw) {
  const city = String(cityRaw || '').trim();
  if (!city) {
    return { error: 'city query parameter is required' };
  }

  // OpenAQ v2 latest measurements
  // Example: https://api.openaq.org/v2/latest?city=Melbourne
  const url = new URL('https://api.openaq.org/v2/latest');
  url.searchParams.set('city', city);

  const resp = await fetch(url.toString(), { headers: { 'accept': 'application/json' } });
  if (!resp.ok) {
    return { error: `upstream error: ${resp.status}` };
  }
  const body = await resp.json();

  // Extract a few common parameters if present
  let pm25 = null, pm10 = null, o3 = null, no2 = null, so2 = null, co = null;
  let lastUpdated = null;

  if (Array.isArray(body?.results)) {
    for (const loc of body.results) {
      if (Array.isArray(loc.measurements)) {
        for (const m of loc.measurements) {
          const p = String(m.parameter || '').toLowerCase();
          const val = typeof m.value === 'number' ? m.value : null;
          if (['pm25', 'pm2.5'].includes(p) && pm25 == null) pm25 = val;
          if (p === 'pm10' && pm10 == null) pm10 = val;
          if (p === 'o3' && o3 == null) o3 = val;
          if (p === 'no2' && no2 == null) no2 = val;
          if (p === 'so2' && so2 == null) so2 = val;
          if (p === 'co' && co == null) co = val;
          if (!lastUpdated && m.lastUpdated) lastUpdated = m.lastUpdated;
        }
      }
    }
  }

  return {
    city,
    source: 'openaq',
    metrics: {
      pm25, pm10, o3, no2, so2, co,
    },
    lastUpdated: lastUpdated || null,
  };
}

// ---------- Routes ----------
app.get('/', (req, res) => {
  res.json({ message: 'Hello from DevOps Pipeline app' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/aqi', async (req, res) => {
  try {
    const { city } = req.query;
    if (!city || !String(city).trim()) {
      return res.status(400).json({ error: 'Please provide ?city=Name' });
    }

    const key = cacheKeyForCity(city);
    const now = Date.now();
    const cached = aqiCache.get(key);

    if (cached && cached.expiry > now) {
      return res.json({ ...cached.data, cached: true });
    }

    const data = await fetchCityAQIMetrics(city);
    if (data.error) {
      // Don’t cache failures
      return res.status(502).json({ error: data.error });
    }

    // Save to cache
    aqiCache.set(key, {
      data,
      expiry: now + CACHE_TTL_MS,
    });

    return res.json({ ...data, cached: false });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', details: String(err?.message || err) });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    res.status(500).send(`# metrics_error ${String(err?.message || err)}\n`);
  }
});

// ---------- Export for tests; only listen when not under Jest ----------
export default app;

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (isDirectRun && !isTest) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
