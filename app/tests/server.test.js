import request from "supertest";
import app from "../server.js";


describe("HTTP server", () => {
  it("GET /health → 200 {status:'ok'}", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
