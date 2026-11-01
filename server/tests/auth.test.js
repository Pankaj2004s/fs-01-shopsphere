import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/features/users/user.model.js";
import { verifyToken } from "../src/utils/token.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

describe("auth API", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("POST /api/auth/register", () => {
    const validBody = {
      name: "Pankaj",
      email: "pankaj@test.dev",
      password: "password123",
    };

    it("creates a customer and returns user and token", async () => {
      const res = await request(app).post("/api/auth/register").send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("pankaj@test.dev");
      expect(res.body.user.role).toBe("customer");
      expect(res.body.user.password).toBeUndefined();
      expect(verifyToken(res.body.token).id).toBe(res.body.user.id);
    });

    it("stores the password hashed, not as plain text", async () => {
      await request(app).post("/api/auth/register").send(validBody);

      const saved = await User.findOne({ email: validBody.email }).select(
        "+password",
      );

      expect(saved.password).not.toBe(validBody.password);
      expect(saved.password).toMatch(/^\$2[aby]\$/);
    });

    it("trims and lowercases the email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, email: "  PANKAJ@Test.dev " });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("pankaj@test.dev");
    });

    it("ignores a role sent by the client", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...validBody, role: "admin" });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("customer");

      const saved = await User.findOne({ email: validBody.email });
      expect(saved.role).toBe("customer");
    });

    it("returns 409 when the email is already registered", async () => {
      await createUser({ email: validBody.email });

      const res = await request(app).post("/api/auth/register").send(validBody);

      expect(res.status).toBe(409);
      expect(await User.countDocuments()).toBe(1);
    });

    it.each([
      ["an invalid email", { ...validBody, email: "not-an-email" }],
      ["a short password", { ...validBody, password: "short" }],
      ["an empty name", { ...validBody, name: "" }],
      ["an empty body", {}],
    ])("returns 400 for %s and creates no user", async (label, body) => {
      const res = await request(app).post("/api/auth/register").send(body);

      expect(res.status).toBe(400);
      expect(await User.countDocuments()).toBe(0);
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials and returns a token", async () => {
      const { user, password } = await createUser({ email: "login@test.dev" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@test.dev", password });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("login@test.dev");
      expect(res.body.user.password).toBeUndefined();
      expect(verifyToken(res.body.token).id).toBe(user._id.toString());
    });

    it("accepts the email in any case", async () => {
      const { password } = await createUser({ email: "login@test.dev" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "  LOGIN@Test.dev ", password });

      expect(res.status).toBe(200);
    });

    it("returns 401 for a wrong password", async () => {
      await createUser({ email: "login@test.dev" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "login@test.dev", password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
      expect(res.body.token).toBeUndefined();
    });

    it("gives the same 401 message for an unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.dev", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it.each([
      ["an invalid email", { email: "not-an-email", password: "password123" }],
      ["an empty password", { email: "login@test.dev", password: "" }],
      ["an empty body", {}],
    ])("returns 400 for %s", async (label, body) => {
      const res = await request(app).post("/api/auth/login").send(body);

      expect(res.status).toBe(400);
    });
  });
});
