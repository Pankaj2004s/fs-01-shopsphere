import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { redis, connectRedis, disconnectRedis } from "../src/config/redis.js";
import Cart from "../src/features/cart/cart.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory, createProduct } from "./helpers/catalogFactories.js";

const isTestDb = () => env.redisUrl.endsWith("/1");
const bearer = (token) => `Bearer ${token}`;
const listPublic = (queryString = "") =>
  request(app).get(`/api/products${queryString}`);

describe("product list cache", () => {
  beforeAll(async () => {
    if (!isTestDb()) {
      throw new Error("Refusing to run: REDIS_URL must use database 1");
    }
    await connectTestDB();
    await connectRedis();
  });

  beforeEach(async () => {
    await redis.flushDb();
  });

  afterEach(clearDB);

  afterAll(async () => {
    if (isTestDb()) {
      await redis.flushDb();
    }
    await disconnectRedis();
    await disconnectTestDB();
  });

  it("serves the second identical request from the cache", async () => {
    await createProduct({ name: "First" });

    const first = await listPublic();
    await createProduct({ name: "Second" });
    const second = await listPublic();

    expect(first.body.pagination.total).toBe(1);
    expect(second.status).toBe(200);
    expect(second.body.pagination.total).toBe(1);
    expect(second.body.products.map((p) => p.name)).toEqual(["First"]);
  });

  it("keeps a separate cache entry for a different query", async () => {
    await createProduct({ name: "First" });
    await listPublic();
    await createProduct({ name: "Second" });

    const other = await listPublic("?limit=5");

    expect(other.body.pagination.total).toBe(2);
  });

  it("shows a newly created product right away", async () => {
    const { token } = await createUser({ role: "vendor" });
    const category = await createCategory();
    const warm = await listPublic();
    expect(warm.body.pagination.total).toBe(0);

    const created = await request(app)
      .post("/api/products")
      .set("Authorization", bearer(token))
      .send({
        name: "Fresh",
        price: 100,
        category: category._id.toString(),
      });
    const after = await listPublic();

    expect(created.status).toBe(201);
    expect(after.body.products.map((p) => p.name)).toEqual(["Fresh"]);
  });

  it("shows an updated product right away", async () => {
    const { user, token } = await createUser({ role: "vendor" });
    const product = await createProduct({ name: "Old Name", vendor: user._id });
    const warm = await listPublic();
    expect(warm.body.products[0].name).toBe("Old Name");

    const updated = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Authorization", bearer(token))
      .send({ name: "New Name" });
    const after = await listPublic();

    expect(updated.status).toBe(200);
    expect(after.body.products[0].name).toBe("New Name");
  });

  it("removes a deleted product from the list right away", async () => {
    const { user, token } = await createUser({ role: "vendor" });
    const product = await createProduct({ vendor: user._id });
    const warm = await listPublic();
    expect(warm.body.pagination.total).toBe(1);

    const deleted = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Authorization", bearer(token));
    const after = await listPublic();

    expect(deleted.status).toBe(204);
    expect(after.body.pagination.total).toBe(0);
  });

  it("does not touch the cache when a write is rejected", async () => {
    const { user } = await createUser({ role: "vendor" });
    const product = await createProduct({ vendor: user._id });
    const { token: otherToken } = await createUser({ role: "vendor" });
    await listPublic();

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Authorization", bearer(otherToken))
      .send({ name: "Hacked" });

    expect(res.status).toBe(403);
    expect(await redis.get("cache:products:version")).toBeNull();
  });

  it("never caches the vendor's own product list", async () => {
    const { user, token } = await createUser({ role: "vendor" });

    const before = await request(app)
      .get("/api/products/mine")
      .set("Authorization", bearer(token));
    await createProduct({ vendor: user._id });
    const after = await request(app)
      .get("/api/products/mine")
      .set("Authorization", bearer(token));

    expect(before.body.pagination.total).toBe(0);
    expect(after.body.pagination.total).toBe(1);
    expect(await redis.keys("cache:*")).toEqual([]);
  });

  it("shows the reduced stock right away after an order is placed", async () => {
    const { user: vendor } = await createUser({ role: "vendor" });
    const { user: customer, token } = await createUser();
    const product = await createProduct({ vendor: vendor._id, stock: 10 });
    await Cart.create({
      user: customer._id,
      items: [{ product: product._id, quantity: 2 }],
    });
    const warm = await listPublic();
    expect(warm.body.products[0].stock).toBe(10);

    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", bearer(token));
    const after = await listPublic();

    expect(placed.status).toBe(201);
    expect(after.body.products[0].stock).toBe(8);
  });

  it("shows the restored stock right away after an order is cancelled", async () => {
    const { user: vendor } = await createUser({ role: "vendor" });
    const { user: customer, token } = await createUser();
    const product = await createProduct({ vendor: vendor._id, stock: 10 });
    await Cart.create({
      user: customer._id,
      items: [{ product: product._id, quantity: 2 }],
    });
    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", bearer(token));
    expect(placed.status).toBe(201);
    const warm = await listPublic();
    expect(warm.body.products[0].stock).toBe(8);

    const cancelled = await request(app)
      .patch(`/api/orders/${placed.body.order._id}/status`)
      .set("Authorization", bearer(token))
      .send({ status: "cancelled" });
    const after = await listPublic();

    expect(cancelled.status).toBe(200);
    expect(after.body.products[0].stock).toBe(10);
  });
});
