import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Order from "../src/features/orders/order.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const makeOrder = (userId, overrides = {}) =>
  Order.create({
    user: userId,
    items: [
      {
        product: randomId(),
        vendor: randomId(),
        name: "Cotton T-Shirt",
        price: 100,
        quantity: 1,
      },
    ],
    totalAmount: 100,
    ...overrides,
  });

const listOrders = (token, queryString = "") =>
  request(app)
    .get(`/api/orders${queryString}`)
    .set("Authorization", bearer(token));

describe("order history API", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("GET /api/orders", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get("/api/orders");

      expect(res.status).toBe(401);
    });

    it("returns an empty list with pagination when there are no orders", async () => {
      const { token } = await createUser();

      const res = await listOrders(token);

      expect(res.status).toBe(200);
      expect(res.body.orders).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it("returns only the logged-in user's orders", async () => {
      const { user: alice, token: aliceToken } = await createUser();
      const { user: bob } = await createUser();
      await makeOrder(alice._id, { totalAmount: 111 });
      await makeOrder(bob._id, { totalAmount: 222 });

      const res = await listOrders(aliceToken);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0].totalAmount).toBe(111);
      expect(res.body.orders[0].user).toBe(alice._id.toString());
      expect(res.body.pagination.total).toBe(1);
    });

    it("sorts newest first", async () => {
      const { user, token } = await createUser();
      for (const totalAmount of [100, 200, 300]) {
        await makeOrder(user._id, { totalAmount });
      }

      const res = await listOrders(token);

      expect(res.body.orders.map((o) => o.totalAmount)).toEqual([
        300, 200, 100,
      ]);
    });

    it("paginates with page and limit", async () => {
      const { user, token } = await createUser();
      for (let i = 0; i < 5; i += 1) {
        await makeOrder(user._id);
      }

      const page2 = await listOrders(token, "?page=2&limit=2");
      const page3 = await listOrders(token, "?page=3&limit=2");

      expect(page2.body.orders).toHaveLength(2);
      expect(page2.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
      expect(page3.body.orders).toHaveLength(1);
    });

    it("filters by status", async () => {
      const { user, token } = await createUser();
      await makeOrder(user._id, { status: "pending" });
      await makeOrder(user._id, { status: "cancelled" });
      await makeOrder(user._id, { status: "pending" });

      const res = await listOrders(token, "?status=cancelled");

      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0].status).toBe("cancelled");
      expect(res.body.pagination.total).toBe(1);
    });

    it.each([
      ["page 0", "?page=0"],
      ["limit above 50", "?limit=51"],
      ["an unknown status", "?status=lost"],
    ])("returns 400 for %s", async (label, queryString) => {
      const { token } = await createUser();

      const res = await listOrders(token, queryString);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/orders/:id", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).get(`/api/orders/${randomId()}`);

      expect(res.status).toBe(401);
    });

    it("returns the order to its owner with the saved item snapshot", async () => {
      const { user, token } = await createUser();
      const order = await makeOrder(user._id, { totalAmount: 100 });

      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(200);
      expect(res.body.order._id).toBe(order._id.toString());
      expect(res.body.order.items[0]).toMatchObject({
        name: "Cotton T-Shirt",
        price: 100,
        quantity: 1,
      });
    });

    it("returns 404 (not 403) when the order belongs to someone else", async () => {
      const { user: alice } = await createUser();
      const { token: bobToken } = await createUser();
      const order = await makeOrder(alice._id);

      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set("Authorization", bearer(bobToken));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });

    it("returns 404 for a valid id that does not exist", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get(`/api/orders/${randomId()}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });

    it("returns 400 for a malformed id", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get("/api/orders/not-an-id")
        .set("Authorization", bearer(token));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid id");
    });
  });
});