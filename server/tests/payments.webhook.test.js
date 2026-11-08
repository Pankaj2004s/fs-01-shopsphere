import crypto from "node:crypto";
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
import mongoose from "mongoose";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import Order from "../src/features/orders/order.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";

const WEBHOOK_SECRET = "test_webhook_secret";
const originalSecret = env.razorpayWebhookSecret;
const PROVIDER_ORDER_ID = "order_test123";

const randomId = () => new mongoose.Types.ObjectId();

const sign = (rawBody, secret = WEBHOOK_SECRET) =>
  crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

const eventBody = (event, overrides = {}) =>
  JSON.stringify({
    event,
    payload: {
      payment: {
        entity: { id: "pay_wh1", order_id: PROVIDER_ORDER_ID, ...overrides },
      },
    },
  });

const sendWebhook = (rawBody, signature = sign(rawBody)) => {
  const req = request(app)
    .post("/api/payments/webhook")
    .set("Content-Type", "application/json");
  if (signature !== null) {
    req.set("x-razorpay-signature", signature);
  }
  return req.send(rawBody);
};

const makeOrder = (overrides = {}) =>
  Order.create({
    user: randomId(),
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
    payment: { provider: "razorpay", providerOrderId: PROVIDER_ORDER_ID },
    ...overrides,
  });

describe("POST /api/payments/webhook", () => {
  beforeAll(connectTestDB);
  beforeEach(() => {
    env.razorpayWebhookSecret = WEBHOOK_SECRET;
  });
  afterEach(clearDB);
  afterAll(async () => {
    env.razorpayWebhookSecret = originalSecret;
    await disconnectTestDB();
  });

  it("returns 400 when the signature header is missing", async () => {
    const order = await makeOrder();

    const res = await sendWebhook(eventBody("payment.captured"), null);

    expect(res.status).toBe(400);
    expect((await Order.findById(order._id)).paymentStatus).toBe("unpaid");
  });

  it("returns 400 for a wrong signature and changes nothing", async () => {
    const order = await makeOrder();
    const body = eventBody("payment.captured");

    const res = await sendWebhook(body, sign(body, "some_other_secret"));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid webhook signature");
    expect((await Order.findById(order._id)).paymentStatus).toBe("unpaid");
  });

  it("returns 503 when the webhook secret is not configured", async () => {
    env.razorpayWebhookSecret = "";
    const body = eventBody("payment.captured");

    const res = await sendWebhook(body, "anything");

    expect(res.status).toBe(503);
  });

  it("returns 400 when the body is not valid JSON even with a valid signature", async () => {
    const res = await sendWebhook("not json at all");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid webhook body");
  });

  it("marks the order paid on payment.captured", async () => {
    const order = await makeOrder();

    const res = await sendWebhook(eventBody("payment.captured"));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });

    const saved = await Order.findById(order._id);
    expect(saved.paymentStatus).toBe("paid");
    expect(saved.payment.providerPaymentId).toBe("pay_wh1");
    expect(saved.payment.providerOrderId).toBe(PROVIDER_ORDER_ID);
    expect(saved.payment.paidAt).toBeInstanceOf(Date);
  });

  it("is idempotent: the same event twice keeps the first paidAt", async () => {
    const order = await makeOrder();
    const body = eventBody("payment.captured");

    const first = await sendWebhook(body);
    const paidAt = (await Order.findById(order._id)).payment.paidAt;
    const second = await sendWebhook(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved.payment.paidAt.getTime()).toBe(paidAt.getTime());
  });

  it("marks an unpaid order failed on payment.failed", async () => {
    const order = await makeOrder();

    const res = await sendWebhook(eventBody("payment.failed"));

    expect(res.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved.paymentStatus).toBe("failed");
    expect(saved.payment.paidAt).toBeUndefined();
  });

  it("never turns a paid order into failed", async () => {
    const order = await makeOrder({ paymentStatus: "paid" });

    const res = await sendWebhook(eventBody("payment.failed"));

    expect(res.status).toBe(200);
    expect((await Order.findById(order._id)).paymentStatus).toBe("paid");
  });

  it("lets a retry succeed: failed first, then captured", async () => {
    const order = await makeOrder();

    await sendWebhook(eventBody("payment.failed"));
    await sendWebhook(eventBody("payment.captured", { id: "pay_wh2" }));

    const saved = await Order.findById(order._id);
    expect(saved.paymentStatus).toBe("paid");
    expect(saved.payment.providerPaymentId).toBe("pay_wh2");
  });

  it("returns 200 when no order matches the provider order id", async () => {
    const order = await makeOrder();

    const res = await sendWebhook(
      eventBody("payment.captured", { order_id: "order_unknown" }),
    );

    expect(res.status).toBe(200);
    expect((await Order.findById(order._id)).paymentStatus).toBe("unpaid");
  });

  it("returns 200 and ignores events it does not handle", async () => {
    const order = await makeOrder();

    const res = await sendWebhook(eventBody("refund.created"));

    expect(res.status).toBe(200);
    expect((await Order.findById(order._id)).paymentStatus).toBe("unpaid");
  });
});
