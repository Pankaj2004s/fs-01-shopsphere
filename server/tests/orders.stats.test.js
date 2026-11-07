import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Order from "../src/features/orders/order.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory, createProduct } from "./helpers/catalogFactories.js";

const randomId = () => new mongoose.Types.ObjectId();

const line = (vendorId, overrides = {}) => ({
  product: randomId(),
  vendor: vendorId,
  name: "Item",
  price: 100,
  quantity: 1,
  ...overrides,
});

const makeOrder = (customerId, items, overrides = {}) =>
  Order.create({
    user: customerId,
    items,
    totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    ...overrides,
  });

const getStats = (token) =>
  request(app)
    .get("/api/orders/vendor/stats")
    .set("Authorization", `Bearer ${token}`);

describe("GET /api/orders/vendor/stats", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/orders/vendor/stats");

    expect(res.status).toBe(401);
  });

  it.each(["customer", "admin"])("returns 403 for a %s", async (role) => {
    const { token } = await createUser({ role });

    const res = await getStats(token);

    expect(res.status).toBe(403);
  });

  it("returns zeros for a vendor with no orders and no products", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await getStats(token);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({
      totalOrders: 0,
      revenue: 0,
      unitsSold: 0,
      statusCounts: {
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      },
      productCount: 0,
      lowStock: [],
    });
  });

  it("counts orders by status and adds revenue only for confirmed, shipped and delivered", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const customerId = randomId();
    await makeOrder(customerId, [line(vendor._id, { price: 100, quantity: 2 })], {
      status: "pending",
    });
    await makeOrder(customerId, [line(vendor._id, { price: 50, quantity: 1 })], {
      status: "confirmed",
    });
    await makeOrder(customerId, [line(vendor._id, { price: 200, quantity: 1 })], {
      status: "shipped",
    });
    await makeOrder(customerId, [line(vendor._id, { price: 300, quantity: 3 })], {
      status: "delivered",
    });
    await makeOrder(customerId, [line(vendor._id, { price: 999, quantity: 5 })], {
      status: "cancelled",
    });

    const res = await getStats(token);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalOrders).toBe(5);
    expect(res.body.stats.statusCounts).toEqual({
      pending: 1,
      confirmed: 1,
      shipped: 1,
      delivered: 1,
      cancelled: 1,
    });
    expect(res.body.stats.revenue).toBe(50 + 200 + 900);
    expect(res.body.stats.unitsSold).toBe(1 + 1 + 3);
  });

  it("counts only this vendor's lines when an order has several vendors", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const otherVendorId = randomId();
    await makeOrder(
      randomId(),
      [
        line(vendor._id, { price: 100, quantity: 2 }),
        line(vendor._id, { price: 50, quantity: 1 }),
        line(otherVendorId, { price: 1000, quantity: 1 }),
      ],
      { status: "confirmed" },
    );

    const res = await getStats(token);

    expect(res.body.stats.totalOrders).toBe(1);
    expect(res.body.stats.revenue).toBe(250);
    expect(res.body.stats.unitsSold).toBe(3);
  });

  it("does not include orders that belong only to another vendor", async () => {
    const { token } = await createUser({ role: "vendor" });
    await makeOrder(randomId(), [line(randomId(), { price: 500 })], {
      status: "delivered",
    });

    const res = await getStats(token);

    expect(res.body.stats.totalOrders).toBe(0);
    expect(res.body.stats.revenue).toBe(0);
  });

  it("returns the product count and the lowest stock products first, max 5", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const { user: other } = await createUser({ role: "vendor" });
    const category = await createCategory();
    const stocks = [0, 1, 2, 3, 4, 5, 6, 50];
    for (const stock of stocks) {
      await createProduct({
        name: `Stock ${stock}`,
        stock,
        vendor: vendor._id,
        category: category._id,
      });
    }
    await createProduct({
      name: "Other vendor low",
      stock: 0,
      vendor: other._id,
      category: category._id,
    });

    const res = await getStats(token);

    expect(res.body.stats.productCount).toBe(8);
    expect(res.body.stats.lowStock).toHaveLength(5);
    expect(res.body.stats.lowStock.map((p) => p.name)).toEqual([
      "Stock 0",
      "Stock 1",
      "Stock 2",
      "Stock 3",
      "Stock 4",
    ]);
    expect(res.body.stats.lowStock[0]).toMatchObject({ name: "Stock 0", stock: 0 });
  });
});
