import { jest } from '@jest/globals';
import request from "supertest";
import app from "../server.js";

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
    // Mock the fetch call
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenAQPayload,
    });

    const res1 = await request(app).get('/aqi?city=Melbourne');
    expect(res1.status).toBe(200);
    expect(res1.body.city).toBe('Melbourne');
    expect(res1.body.cached).toBe(false);
    expect(res1.body.metrics.pm25).toBe(11.2);
    expect(res1.body.metrics.pm10).toBe(22.5);
    expect(res1.body.metrics.o3).toBe(30.1);
  });
});
