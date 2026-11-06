import fs from "node:fs/promises";
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

const MAX_SIZE = 5 * 1024 * 1024;

const postImage = (token) =>
  request(app).post("/api/uploads/images").set("Authorization", `Bearer ${token}`);

const attachImage = (req, buffer, overrides = {}) =>
  req.attach(overrides.field ?? "image", buffer, {
    filename: overrides.filename ?? "photo.png",
    contentType: overrides.contentType ?? "image/png",
  });

describe("POST /api/uploads/images", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(async () => {
    await disconnectTestDB();
    await fs.rm(env.uploadDir, { recursive: true, force: true });
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/uploads/images");

    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const { token } = await createUser({ role: "customer" });

    const res = await attachImage(postImage(token), Buffer.from("img"));

    expect(res.status).toBe(403);
  });

  it("returns 400 when no file is sent", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await postImage(token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Image file is required");
  });

  it("returns 400 for a file type that is not allowed", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await attachImage(postImage(token), Buffer.from("<script>"), {
      filename: "evil.html",
      contentType: "text/html",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Only JPEG, PNG or WebP images are allowed");
  });

  it("returns 400 when the file is sent in the wrong field", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await attachImage(postImage(token), Buffer.from("img"), {
      field: "file",
    });

    expect(res.status).toBe(400);
  });

  it("returns 413 when the file is larger than 5 MB", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await attachImage(postImage(token), Buffer.alloc(MAX_SIZE + 1));

    expect(res.status).toBe(413);
    expect(res.body.message).toBe("Image is too large, maximum size is 5 MB");
  });

  it.each(["vendor", "admin"])("returns 201 and a url for a %s", async (role) => {
    const { token } = await createUser({ role });

    const res = await attachImage(postImage(token), Buffer.from("fake-png-bytes"));

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(
      new RegExp(`^${env.serverUrl}/uploads/[0-9a-f-]{36}\\.png$`),
    );
  });

  it("serves the uploaded image with a cross-origin policy header", async () => {
    const { token } = await createUser({ role: "vendor" });
    const content = Buffer.from("fake-png-bytes");

    const uploaded = await attachImage(postImage(token), content);
    const { pathname } = new URL(uploaded.body.url);
    const res = await request(app).get(pathname);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(Buffer.compare(res.body, content)).toBe(0);
  });
});
