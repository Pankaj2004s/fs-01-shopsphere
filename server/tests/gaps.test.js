import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import {
  canTransition,
  canActorSet,
} from "../src/features/orders/order.transitions.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createProduct } from "./helpers/catalogFactories.js";
import mongoose from "mongoose";

describe("unknown routes", () => {
  it("returns 404 with the requested url in the message", async () => {
    const res = await request(app).get("/api/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Route not found: /api/does-not-exist");
  });
});

describe("order transition rules (pure functions)", () => {
  it.each([
    ["pending", "confirmed", true],
    ["pending", "cancelled", true],
    ["shipped", "delivered", true],
    ["pending", "shipped", false],
    ["delivered", "cancelled", false],
  ])("canTransition(%s, %s) is %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("canTransition is false for an unknown current status", () => {
    expect(canTransition("lost", "confirmed")).toBe(false);
  });

  it.each([
    ["customer", "cancelled", true],
    ["customer", "shipped", false],
    ["vendor", "shipped", true],
    ["vendor", "pending", false],
  ])("canActorSet(%s, %s) is %s", (actor, to, expected) => {
    expect(canActorSet(actor, to)).toBe(expected);
  });

  it("canActorSet is false for an unknown actor", () => {
    expect(canActorSet("admin", "cancelled")).toBe(false);
  });
});

describe("product price filter with one bound", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  const seedPrices = async () => {
    const { user: vendor } = await createUser({ role: "vendor" });
    const category = new mongoose.Types.ObjectId();
    for (const price of [50, 100, 200]) {
      await createProduct({ price, vendor: vendor._id, category });
    }
  };

  it("filters with only minPrice", async () => {
    await seedPrices();

    const res = await request(app).get(
      "/api/products?minPrice=100&sort=price_asc",
    );

    expect(res.body.products.map((p) => p.price)).toEqual([100, 200]);
  });

  it("filters with only maxPrice", async () => {
    await seedPrices();

    const res = await request(app).get(
      "/api/products?maxPrice=100&sort=price_asc",
    );

    expect(res.body.products.map((p) => p.price)).toEqual([50, 100]);
  });
});