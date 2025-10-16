// app/tests/metrics.test.js
import request from 'supertest';
import app from '../server.js';

describe('/metrics', () => {
  it('serves Prometheus text format with HELP lines', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    // basic sanity: prom-client emits HELP lines
    expect(res.text).toMatch(/# HELP/);
    // and one of our custom metrics
    expect(res.text).toMatch(/http_requests_total/);
  });
});
