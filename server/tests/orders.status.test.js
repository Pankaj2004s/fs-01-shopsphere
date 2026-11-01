import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Order from "../src/features/orders/order.model.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createProduct } from "./helpers/catalogFactories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const patchStatus = (token, orderId, status) =>
  request(app)
    .patch(`/api/orders/${orderId}/status`)
    .set("Authorization", bearer(token))
    .send({ status });

const setup = async ({ status = "pending", quantity = 2, stock = 8 } = {}) => {
  const { user: customer, token: customerToken } = await createUser();
  const { user: vendor, token: vendorToken } = await createUser({
    role: "vendor",
  });
  const product = await createProduct({
    vendor: vendor._id,
    category: randomId(),
    price: 100,
    stock,
  });
  const order = await Order.create({
    user: customer._id,
    items: [
      {
        product: product._id,
        vendor: vendor._id,
        name: product.name,
        price: 100,
        quantity,
      },
    ],
    totalAmount: 100 * quantity,
    status,
  });

  return { customer, customerToken, vendor, vendorToken, product, order };
};

const statusInDb = async (orderId) => (await Order.findById(orderId)).status;
const stockInDb = async (productId) =>
  (await Product.findById(productId)).stock;

describe("PATCH /api/orders/:id/status", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .patch(`/api/orders/${randomId()}/status`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(401);
  });

  describe("allowed changes", () => {
    it("lets the vendor confirm a pending order and returns the vendor view", async () => {
      const { vendorToken, order } = await setup();

      const res = await patchStatus(vendorToken, order._id, "confirmed");

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe("confirmed");
      expect(res.body.order.items).toHaveLength(1);
      expect(res.body.order.subtotal).toBe(200);
      expect(res.body.order.customer.name).toBe("Test User");
      expect(res.body.order.customer.email).toBeUndefined();
      expect(res.body.order.totalAmount).toBeUndefined();
      expect(await statusInDb(order._id)).toBe("confirmed");
    });

    it("moves an order through confirmed, shipped and delivered without touching stock", async () => {
      const { vendorToken, product, order } = await setup();

      const confirmed = await patchStatus(vendorToken, order._id, "confirmed");
      const shipped = await patchStatus(vendorToken, order._id, "shipped");
      const delivered = await patchStatus(vendorToken, order._id, "delivered");

      expect(confirmed.status).toBe(200);
      expect(shipped.status).toBe(200);
      expect(delivered.status).toBe(200);
      expect(await statusInDb(order._id)).toBe("delivered");
      expect(await stockInDb(product._id)).toBe(8);
    });

    it("lets the customer cancel a pending order, returns the full order and restores stock", async () => {
      const { customer, customerToken, product, order } = await setup();

      const res = await patchStatus(customerToken, order._id, "cancelled");

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe("cancelled");
      expect(res.body.order.totalAmount).toBe(200);
      expect(res.body.order.user).toBe(customer._id.toString());
      expect(await stockInDb(product._id)).toBe(10);
    });

    it("lets the customer cancel a confirmed order", async () => {
      const { customerToken, product, order } = await setup({
        status: "confirmed",
      });

      const res = await patchStatus(customerToken, order._id, "cancelled");

      expect(res.status).toBe(200);
      expect(await stockInDb(product._id)).toBe(10);
    });

    it("lets the vendor cancel an order and restores stock", async () => {
      const { vendorToken, product, order } = await setup();

      const res = await patchStatus(vendorToken, order._id, "cancelled");

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe("cancelled");
      expect(await statusInDb(order._id)).toBe("cancelled");
      expect(await stockInDb(product._id)).toBe(10);
    });

    it("restores the stock of every vendor's line when one vendor cancels", async () => {
      const { customer } = await createUser().then(({ user }) => ({
        customer: user,
      }));
      const { user: vendorA } = await createUser({ role: "vendor" });
      const { user: vendorB, token: vendorBToken } = await createUser({
        role: "vendor",
      });
      const productA = await createProduct({
        vendor: vendorA._id,
        category: randomId(),
        stock: 8,
      });
      const productB = await createProduct({
        vendor: vendorB._id,
        category: randomId(),
        stock: 3,
      });
      const order = await Order.create({
        user: customer._id,
        items: [
          {
            product: productA._id,
            vendor: vendorA._id,
            name: "A",
            price: 100,
            quantity: 2,
          },
          {
            product: productB._id,
            vendor: vendorB._id,
            name: "B",
            price: 50,
            quantity: 1,
          },
        ],
        totalAmount: 250,
      });

      const res = await patchStatus(vendorBToken, order._id, "cancelled");

      expect(res.status).toBe(200);
      expect(res.body.order.items).toHaveLength(1);
      expect(res.body.order.subtotal).toBe(50);
      expect(await stockInDb(productA._id)).toBe(10);
      expect(await stockInDb(productB._id)).toBe(4);
    });
  });

  describe("who may set which status (403)", () => {
    it.each(["confirmed", "shipped", "delivered"])(
      "returns 403 when a customer tries to set %s",
      async (target) => {
        const { customerToken, order } = await setup();

        const res = await patchStatus(customerToken, order._id, target);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe(`You cannot set status to ${target}`);
        expect(await statusInDb(order._id)).toBe("pending");
      },
    );

    it("returns 403 when a vendor tries to set pending", async () => {
      const { vendorToken, order } = await setup({ status: "confirmed" });

      const res = await patchStatus(vendorToken, order._id, "pending");

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You cannot set status to pending");
      expect(await statusInDb(order._id)).toBe("confirmed");
    });
  });

  describe("invalid transitions (409)", () => {
    it.each([
      ["pending", "shipped"],
      ["pending", "delivered"],
      ["confirmed", "delivered"],
      ["shipped", "confirmed"],
      ["delivered", "shipped"],
      ["delivered", "cancelled"],
      ["cancelled", "confirmed"],
    ])("returns 409 for %s to %s", async (from, to) => {
      const { vendorToken, order } = await setup({ status: from });

      const res = await patchStatus(vendorToken, order._id, to);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        `Cannot change status from ${from} to ${to}`,
      );
      expect(await statusInDb(order._id)).toBe(from);
    });

    it("returns 409 when the customer cancels an already shipped order, and keeps the stock", async () => {
      const { customerToken, product, order } = await setup({
        status: "shipped",
      });

      const res = await patchStatus(customerToken, order._id, "cancelled");

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(
        "Cannot change status from shipped to cancelled",
      );
      expect(await stockInDb(product._id)).toBe(8);
    });
  });

  describe("double cancel", () => {
    it("restores stock only once when cancelled twice in a row", async () => {
      const { vendorToken, product, order } = await setup();

      const first = await patchStatus(vendorToken, order._id, "cancelled");
      const second = await patchStatus(vendorToken, order._id, "cancelled");

      expect(first.status).toBe(200);
      expect(second.status).toBe(409);
      expect(second.body.message).toBe(
        "Cannot change status from cancelled to cancelled",
      );
      expect(await stockInDb(product._id)).toBe(10);
    });

    it("restores stock only once when customer and vendor cancel at the same time", async () => {
      const { customerToken, vendorToken, product, order } = await setup();

      const [a, b] = await Promise.all([
        patchStatus(customerToken, order._id, "cancelled"),
        patchStatus(vendorToken, order._id, "cancelled"),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 409]);
      expect(await statusInDb(order._id)).toBe("cancelled");
      expect(await stockInDb(product._id)).toBe(10);
    });
  });

  describe("access and validation", () => {
    it.each([
      ["a stranger", { role: "customer" }],
      ["a vendor with no line in the order", { role: "vendor" }],
      ["an admin", { role: "admin" }],
    ])("returns 404 for %s and changes nothing", async (label, userData) => {
      const { order, product } = await setup();
      const { token } = await createUser(userData);

      const res = await patchStatus(token, order._id, "cancelled");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
      expect(await statusInDb(order._id)).toBe("pending");
      expect(await stockInDb(product._id)).toBe(8);
    });

    it("returns 404 for a valid id that does not exist", async () => {
      const { token } = await createUser();

      const res = await patchStatus(token, randomId(), "cancelled");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });

    it("returns 400 for a malformed order id", async () => {
      const { token } = await createUser();

      const res = await patchStatus(token, "not-an-id", "cancelled");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid id");
    });

    it.each([
      ["an unknown status", { status: "lost" }],
      ["a missing status", {}],
    ])("returns 400 for %s", async (label, body) => {
      const { vendorToken, order } = await setup();

      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set("Authorization", bearer(vendorToken))
        .send(body);

      expect(res.status).toBe(400);
      expect(await statusInDb(order._id)).toBe("pending");
    });
  });
});
