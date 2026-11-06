import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/features/users/user.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

const becomeVendor = (token) =>
  request(app)
    .post("/api/users/become-vendor")
    .set("Authorization", `Bearer ${token}`);

describe("POST /api/users/become-vendor", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/users/become-vendor");

    expect(res.status).toBe(401);
  });

  it("turns a customer into a vendor", async () => {
    const { user, token } = await createUser({ role: "customer" });

    const res = await becomeVendor(token);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user._id.toString());
    expect(res.body.user.role).toBe("vendor");
    expect(res.body.user.password).toBeUndefined();

    const saved = await User.findById(user._id);
    expect(saved.role).toBe("vendor");
  });

  it("returns 409 when the user is already a vendor", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await becomeVendor(token);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("You are already a vendor");
  });

  it("returns 400 for an admin and keeps the role unchanged", async () => {
    const { user, token } = await createUser({ role: "admin" });

    const res = await becomeVendor(token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Admins cannot become vendors");

    const saved = await User.findById(user._id);
    expect(saved.role).toBe("admin");
  });
});
