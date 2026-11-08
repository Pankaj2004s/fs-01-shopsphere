import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import ApiError from "../../../utils/ApiError.js";

export const providerName = "razorpay";

const API_URL = "https://api.razorpay.com/v1";

const assertConfigured = () => {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new ApiError(503, "Payments are not configured");
  }
};

const assertWebhookConfigured = () => {
  if (!env.razorpayWebhookSecret) {
    throw new ApiError(503, "Payment webhook is not configured");
  }
};

const hmacHex = (secret, data) =>
  crypto.createHmac("sha256", secret).update(data).digest("hex");

const safeEqual = (expectedHex, received) => {
  const expected = Buffer.from(expectedHex);
  const actual = Buffer.from(String(received));
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
};

export const createOrder = async ({ amount, currency, receipt }) => {
  assertConfigured();

  const credentials = Buffer.from(
    `${env.razorpayKeyId}:${env.razorpayKeySecret}`,
  ).toString("base64");

  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency, receipt }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    console.error(`Razorpay order failed with status ${response.status}`);
    throw new ApiError(502, "Payment provider could not create the order");
  }

  return response.json();
};

export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  assertConfigured();
  return safeEqual(
    hmacHex(env.razorpayKeySecret, `${orderId}|${paymentId}`),
    signature,
  );
};

export const verifyWebhookSignature = (rawBody, signature) => {
  assertWebhookConfigured();
  return safeEqual(hmacHex(env.razorpayWebhookSecret, rawBody), signature);
};
