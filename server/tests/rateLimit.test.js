import express from "express";
import request from "supertest";
import { describe, it, expect } from "vitest";
import { createLimiter } from "../src/middlewares/rateLimit.js";

function buildApp(path, limiter) {
  const app = express();
  app.get(path, limiter, (req, res) => res.json({ ok: true }));
  return app;
}

describe("createLimiter", () => {
  it("allows requests up to the limit, then answers 429", async () => {
    const app = buildApp(
      "/ping",
      createLimiter({ name: "t1", windowMs: 60000, limit: 2, enabledInTest: true }),
    );

    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(200);
    const res = await request(app).get("/ping");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      message: "Too many requests, please try again later",
    });
  });

  it("uses the custom message when one is given", async () => {
    const app = buildApp(
      "/ping",
      createLimiter({
        name: "t2",
        windowMs: 60000,
        limit: 1,
        message: "Too many login attempts",
        enabledInTest: true,
      }),
    );

    await request(app).get("/ping").expect(200);
    const res = await request(app).get("/ping");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ message: "Too many login attempts" });
  });

  it("sends standard RateLimit headers and no legacy X-RateLimit headers", async () => {
    const app = buildApp(
      "/ping",
      createLimiter({ name: "t3", windowMs: 60000, limit: 5, enabledInTest: true }),
    );

    const res = await request(app).get("/ping").expect(200);
    const names = Object.keys(res.headers);

    expect(names.some((n) => n.startsWith("ratelimit"))).toBe(true);
    expect(names.some((n) => n.startsWith("x-ratelimit"))).toBe(false);
  });

  it("is skipped in the test environment unless enabledInTest is true", async () => {
    const app = buildApp(
      "/ping",
      createLimiter({ name: "t4", windowMs: 60000, limit: 1 }),
    );

    for (let i = 0; i < 5; i += 1) {
      await request(app).get("/ping").expect(200);
    }
  });

  it("keeps a separate counter for each limiter", async () => {
    const app = express();
    app.get(
      "/a",
      createLimiter({ name: "t5a", windowMs: 60000, limit: 1, enabledInTest: true }),
      (req, res) => res.json({ ok: true }),
    );
    app.get(
      "/b",
      createLimiter({ name: "t5b", windowMs: 60000, limit: 1, enabledInTest: true }),
      (req, res) => res.json({ ok: true }),
    );

    await request(app).get("/a").expect(200);
    await request(app).get("/a").expect(429);
    await request(app).get("/b").expect(200);
  });
});
