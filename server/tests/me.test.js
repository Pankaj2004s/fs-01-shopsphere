import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import User from "../src/features/users/user.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

describe("GET /api/auth/me", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns the logged-in user for a valid token", async () => {
    const { user, token } = await createUser({ role: "vendor" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user._id.toString());
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.role).toBe("vendor");
    expect(res.body.user.password).toBeUndefined();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, token missing");
  });

  it("returns 401 when the header does not start with Bearer", async () => {
    const { token } = await createUser();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Token ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, token missing");
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.jwt");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, token invalid or expired");
  });

  it("returns 401 for a token signed with a different secret", async () => {
    const { user } = await createUser();
    const forged = jwt.sign({ id: user._id.toString() }, "some-other-secret");

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, token invalid or expired");
  });

  it("returns 401 for an expired token", async () => {
    const { user } = await createUser();
    const expired = jwt.sign(
      {
        id: user._id.toString(),
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      env.jwtSecret,
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, token invalid or expired");
  });

  it("returns 401 when the token is valid but the user was deleted", async () => {
    const { user, token } = await createUser();
    await User.findByIdAndDelete(user._id);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authorized, user no longer exists");
  });
});