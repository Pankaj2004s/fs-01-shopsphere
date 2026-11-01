import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Order from "../src/features/orders/order.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

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

const listVendorOrders = (token, queryString = "") =>
  request(app)
    .get(`/api/orders/vendor${queryString}`)
    .set("Authorization", bearer(token));

describe("GET /api/orders/vendor", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/orders/vendor");

    expect(res.status).toBe(401);
  });

  it.each(["customer", "admin"])("returns 403 for a %s", async (role) => {
    const { token } = await createUser({ role });

    const res = await listVendorOrders(token);

    expect(res.status).toBe(403);
  });

  it("returns an empty list with pagination when the vendor has no orders", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await listVendorOrders(token);

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it("returns only orders that contain this vendor's products", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const otherVendorId = randomId();
    const mine = await makeOrder(randomId(), [line(vendor._id)]);
    await makeOrder(randomId(), [line(otherVendorId)]);

    const res = await listVendorOrders(token);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0]._id).toBe(mine._id.toString());
    expect(res.body.pagination.total).toBe(1);
  });

  it("shows only this vendor's lines, their subtotal and the customer's name", async () => {
    const { user: customer } = await createUser({ name: "Priya" });
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const otherVendorId = randomId();
    await makeOrder(customer._id, [
      line(vendor._id, { name: "Cotton T-Shirt", price: 100, quantity: 2 }),
      line(otherVendorId, { name: "Running Shoes", price: 500, quantity: 1 }),
    ]);

    const res = await listVendorOrders(token);
    const [order] = res.body.orders;

    expect(res.status).toBe(200);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      name: "Cotton T-Shirt",
      price: 100,
      quantity: 2,
    });
    expect(order.subtotal).toBe(200);
    expect(order.status).toBe("pending");
    expect(order.customer._id).toBe(customer._id.toString());
    expect(order.customer.name).toBe("Priya");
    expect(order.customer.email).toBeUndefined();
    expect(order.customer.password).toBeUndefined();
    expect(order.totalAmount).toBeUndefined();
    expect(order.user).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("Running Shoes");
  });

  it("adds up the subtotal across several lines of the same vendor", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    await makeOrder(randomId(), [
      line(vendor._id, { price: 100, quantity: 2 }),
      line(vendor._id, { price: 50, quantity: 3 }),
    ]);

    const res = await listVendorOrders(token);

    expect(res.body.orders[0].items).toHaveLength(2);
    expect(res.body.orders[0].subtotal).toBe(350);
  });

  it("sorts newest first", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    for (const price of [100, 200, 300]) {
      await makeOrder(randomId(), [line(vendor._id, { price })]);
    }

    const res = await listVendorOrders(token);

    expect(res.body.orders.map((o) => o.subtotal)).toEqual([300, 200, 100]);
  });

  it("filters by status", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    await makeOrder(randomId(), [line(vendor._id)], { status: "shipped" });
    await makeOrder(randomId(), [line(vendor._id)], { status: "pending" });

    const res = await listVendorOrders(token, "?status=shipped");

    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].status).toBe("shipped");
    expect(res.body.pagination.total).toBe(1);
  });

  it("paginates with page and limit", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    for (let i = 0; i < 5; i += 1) {
      await makeOrder(randomId(), [line(vendor._id)]);
    }

    const page2 = await listVendorOrders(token, "?page=2&limit=2");
    const page3 = await listVendorOrders(token, "?page=3&limit=2");

    expect(page2.body.orders).toHaveLength(2);
    expect(page2.body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
    expect(page3.body.orders).toHaveLength(1);
  });

  it.each([
    ["page 0", "?page=0"],
    ["limit above 50", "?limit=51"],
    ["an unknown status", "?status=lost"],
  ])("returns 400 for %s", async (label, queryString) => {
    const { token } = await createUser({ role: "vendor" });

    const res = await listVendorOrders(token, queryString);

    expect(res.status).toBe(400);
  });
});