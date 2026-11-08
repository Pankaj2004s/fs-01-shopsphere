import crypto from "node:crypto";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import Order from "../src/features/orders/order.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";

const TEST_KEY_ID = "rzp_test_unit";
const TEST_SECRET = "test_key_secret";
const originalKeys = {
  id: env.razorpayKeyId,
  secret: env.razorpayKeySecret,
};

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const sign = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", TEST_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

const stubRazorpay = (impl) => {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const razorpayOk = async (url, init) => ({
  ok: true,
  json: async () => ({
    id: "order_test123",
    amount: JSON.parse(init.body).amount,
    currency: "INR",
  }),
});

const makeOrder = (userId, overrides = {}) =>
  Order.create({
    user: userId,
    items: [
      {
        product: randomId(),
        vendor: randomId(),
        name: "Cotton T-Shirt",
        price: 100,
        quantity: 2,
      },
    ],
    totalAmount: 200,
    ...overrides,
  });

const setup = async (overrides = {}) => {
  const { user, token } = await createUser();
  const order = await makeOrder(user._id, overrides);
  return { user, token, order };
};

const startPayment = (token, orderId) =>
  request(app).post(`/api/orders/${orderId}/pay`).set("Authorization", bearer(token));

const confirmBody = (orderId, paymentId = "pay_test1") => ({
  razorpayOrderId: orderId,
  razorpayPaymentId: paymentId,
  razorpaySignature: sign(orderId, paymentId),
});

const confirmPayment = (token, orderId, body) =>
  request(app)
    .post(`/api/orders/${orderId}/pay/confirm`)
    .set("Authorization", bearer(token))
    .send(body);

describe("payments API", () => {
  beforeAll(connectTestDB);
  beforeEach(() => {
    env.razorpayKeyId = TEST_KEY_ID;
    env.razorpayKeySecret = TEST_SECRET;
    stubRazorpay(razorpayOk);
  });
  afterEach(async () => {
    await clearDB();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  afterAll(async () => {
    env.razorpayKeyId = originalKeys.id;
    env.razorpayKeySecret = originalKeys.secret;
    await disconnectTestDB();
  });

  describe("POST /api/orders/:id/pay", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).post(`/api/orders/${randomId()}/pay`);

      expect(res.status).toBe(401);
    });

    it("returns 404 for another user's order", async () => {
      const { order } = await setup();
      const { token: otherToken } = await createUser();

      const res = await startPayment(otherToken, order._id);

      expect(res.status).toBe(404);
    });

    it("returns 409 for a cancelled order", async () => {
      const { token, order } = await setup({ status: "cancelled" });

      const res = await startPayment(token, order._id);

      expect(res.status).toBe(409);
    });

    it("returns 409 for an order that is already paid", async () => {
      const { token, order } = await setup({ paymentStatus: "paid" });

      const res = await startPayment(token, order._id);

      expect(res.status).toBe(409);
    });

    it("creates a provider order in paise and saves its id", async () => {
      const fetchMock = stubRazorpay(razorpayOk);
      const { token, order } = await setup();

      const res = await startPayment(token, order._id);

      expect(res.status).toBe(201);
      expect(res.body.payment).toEqual({
        orderId: order._id.toString(),
        providerOrderId: "order_test123",
        amount: 20000,
        currency: "INR",
        keyId: TEST_KEY_ID,
      });
      expect(JSON.stringify(res.body)).not.toContain(TEST_SECRET);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent).toEqual({
        amount: 20000,
        currency: "INR",
        receipt: order._id.toString(),
      });

      const saved = await Order.findById(order._id);
      expect(saved.payment.provider).toBe("razorpay");
      expect(saved.payment.providerOrderId).toBe("order_test123");
      expect(saved.paymentStatus).toBe("unpaid");
    });

    it("returns 502 when the provider rejects the request", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      stubRazorpay(async () => ({ ok: false, status: 400 }));
      const { token, order } = await setup();

      const res = await startPayment(token, order._id);

      expect(res.status).toBe(502);
    });

    it("returns 503 when razorpay keys are not configured", async () => {
      const fetchMock = stubRazorpay(razorpayOk);
      env.razorpayKeyId = "";
      const { token, order } = await setup();

      const res = await startPayment(token, order._id);

      expect(res.status).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/orders/:id/pay/confirm", () => {
    const withProviderOrder = {
      payment: { provider: "razorpay", providerOrderId: "order_test123" },
    };

    it("returns 401 without a token", async () => {
      const res = await request(app).post(`/api/orders/${randomId()}/pay/confirm`);

      expect(res.status).toBe(401);
    });

    it("marks the order paid when the signature is valid", async () => {
      const { token, order } = await setup(withProviderOrder);

      const res = await confirmPayment(token, order._id, confirmBody("order_test123"));

      expect(res.status).toBe(200);
      expect(res.body.order.paymentStatus).toBe("paid");
      expect(res.body.order.payment.providerPaymentId).toBe("pay_test1");
      expect(res.body.order.payment.paidAt).toBeDefined();

      const saved = await Order.findById(order._id);
      expect(saved.paymentStatus).toBe("paid");
    });

    it("returns 400 and keeps the order unpaid for a bad signature", async () => {
      const { token, order } = await setup(withProviderOrder);

      const res = await confirmPayment(token, order._id, {
        ...confirmBody("order_test123"),
        razorpaySignature: "bad",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid payment signature");
      expect((await Order.findById(order._id)).paymentStatus).toBe("unpaid");
    });

    it("returns 400 when the payment belongs to a different provider order", async () => {
      const { token, order } = await setup(withProviderOrder);

      const res = await confirmPayment(token, order._id, confirmBody("order_other"));

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Payment does not belong to this order");
    });

    it("returns 404 for another user's order", async () => {
      const { order } = await setup(withProviderOrder);
      const { token: otherToken } = await createUser();

      const res = await confirmPayment(otherToken, order._id, confirmBody("order_test123"));

      expect(res.status).toBe(404);
    });

    it("is idempotent: confirming twice returns the same paid order", async () => {
      const { token, order } = await setup(withProviderOrder);
      const body = confirmBody("order_test123");

      const first = await confirmPayment(token, order._id, body);
      const second = await confirmPayment(token, order._id, body);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.order.payment.paidAt).toBe(first.body.order.payment.paidAt);
    });

    it("returns 400 when the body is missing fields", async () => {
      const { token, order } = await setup(withProviderOrder);

      const res = await confirmPayment(token, order._id, {});

      expect(res.status).toBe(400);
    });
  });
});
