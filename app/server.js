// app/server.js — Local JSON Data Backend (Offline Mode)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---------- Metrics Setup (Step 1) ----------
import { collectDefaultMetrics, Registry, Counter, Histogram } from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register });

// Count every HTTP request
const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

// Measure duration of each request
const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Middleware to record metrics
app.use((req, res, next) => {
  const end = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    httpRequestsTotal.labels(req.method, req.path, String(res.statusCode)).inc();
    end({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

// Endpoint for Prometheus
app.get("/metrics", async (_, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
});


// Serve static front-end files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Health check route
app.get("/health", (_, res) => {
  res.json({ status: "ok", source: "local-json", timestamp: new Date().toISOString() });
});

// Load JSON data once at startup
const dataPath = path.join(__dirname, "public", "data", "aqi.json");
let cities = [];
try {
  const fileContent = fs.readFileSync(dataPath, "utf8");
  cities = JSON.parse(fileContent);
  console.log(`✅ Loaded ${cities.length} cities from aqi.json`);
} catch (err) {
  console.error("❌ Error loading local data:", err);
  cities = [];
}

// Helper: find a city (case-insensitive)
function findCity(name) {
  if (!name) return null;
  return cities.find(
    (c) => c.city.toLowerCase() === String(name).trim().toLowerCase()
  );
}

// AQI endpoint
app.get('/aqi', async (req, res) => {
  const city = req.query.city;
  if (!city) {
    return res.status(400).json({ error: 'City parameter is required' });
  }

  try {
    const response = await fetch(`https://api.openaq.org/v2/latest?city=${city}`);
    const data = await response.json();
    
    console.log('API Response:', JSON.stringify(data, null, 2)); // Debug log
    
    const metrics = {};
    data.results[0].measurements.forEach(m => {
      metrics[m.parameter] = m.value;
    });

    console.log('Processed Metrics:', metrics); // Debug log

    res.json({
      city,
      cached: false,
      metrics
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AQI data' });
  }
});

// Weather endpoint
app.get("/weather", (req, res) => {
  const cityName = req.query.city;
  if (!cityName) return res.status(400).json({ error: "Missing ?city parameter" });

  const cityData = findCity(cityName);
  if (!cityData) return res.status(404).json({ error: `No local data found for ${cityName}` });

  res.json({
    city: cityData.city,
    temperature: cityData.weather.temperature,
    humidity: cityData.weather.humidity,
    wind: cityData.weather.wind,
    condition: cityData.weather.condition,
    updated: cityData.lastUpdated,
    source: "local-json",
    cached: false,
  });
});

// Export the app before starting the server
export default app;

// Only start the server if this file is run directly (not imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 8080;
  app.listen(port, () =>
    console.log(` Local AQI + Weather Dashboard running at http://localhost:${port}`)
  );
}
