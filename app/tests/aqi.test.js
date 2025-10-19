// app/tests/aqi.test.js
import request from 'supertest';
import app from '../server.js';
import { jest } from '@jest/globals';

const mockOpenAQPayload = {
  results: [
    {
      measurements: [
        { parameter: 'pm25', value: 11.2, lastUpdated: '2025-10-16T10:00:00Z' },
        { parameter: 'pm10', value: 22.5, lastUpdated: '2025-10-16T10:00:00Z' },
        { parameter: 'o3',   value: 30.1, lastUpdated: '2025-10-16T10:00:00Z' },
      ],
    },
  ],
};

describe('/aqi', () => {
  let realFetch;

  beforeAll(() => {
    realFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('returns metrics for a city and caches for 60s', async () => {
    // mock the first network call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenAQPayload,
    });

    // First call: should not be cached
    const res1 = await request(app).get('/aqi?city=Melbourne');
    expect(res1.status).toBe(200);
    expect(res1.body.city).toBe('Melbourne');
    expect(res1.body.cached).toBe(false);
    expect(res1.body.metrics.pm25).toBe(11.2);
    expect(res1.body.metrics.pm10).toBe(22.5);
    expect(res1.body.metrics.o3).toBe(30.1);

    // Second call immediately: should hit in-memory cache (no extra fetch needed)
    const res2 = await request(app).get('/aqi?city=Melbourne');
    expect(res2.status).toBe(200);
    expect(res2.body.cached).toBe(true);

    // Ensure our mock fetch was only called once (second came from cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('400 when city missing', async () => {
    const res = await request(app).get('/aqi');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/provide \?city=/i);
  });
});
