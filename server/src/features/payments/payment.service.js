import Order from "../orders/order.model.js";
import ApiError from "../../utils/ApiError.js";
import { env } from "../../config/env.js";
import {
  createOrder,
  providerName,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./providers/razorpay.provider.js";

const toPaise = (rupees) => Math.round(rupees * 100);

export const createPayment = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  if (order.status === "cancelled") {
    throw new ApiError(409, "A cancelled order cannot be paid");
  }
  if (order.paymentStatus === "paid") {
    throw new ApiError(409, "Order is already paid");
  }

  const providerOrder = await createOrder({
    amount: toPaise(order.totalAmount),
    currency: "INR",
    receipt: String(order._id),
  });

  order.payment = {
    provider: providerName,
    providerOrderId: providerOrder.id,
  };
  await order.save();

  return {
    orderId: order._id,
    providerOrderId: providerOrder.id,
    amount: providerOrder.amount,
    currency: providerOrder.currency,
    keyId: env.razorpayKeyId,
  };
};

export const confirmPayment = async (
  userId,
  orderId,
  { razorpayOrderId, razorpayPaymentId, razorpaySignature },
) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  if (order.paymentStatus === "paid") {
    return order;
  }
  if (order.payment?.providerOrderId !== razorpayOrderId) {
    throw new ApiError(400, "Payment does not belong to this order");
  }

  const valid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: "paid" } },
    {
      $set: {
        paymentStatus: "paid",
        "payment.providerPaymentId": razorpayPaymentId,
        "payment.paidAt": new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return updated ?? (await Order.findById(order._id));
};

export const processWebhook = async (rawBody, signature) => {
  if (
    !Buffer.isBuffer(rawBody) ||
    !verifyWebhookSignature(rawBody, signature)
  ) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new ApiError(400, "Invalid webhook body");
  }

  const payment = event?.payload?.payment?.entity;
  if (!payment?.order_id) {
    return;
  }

  if (event.event === "payment.captured") {
    await Order.updateOne(
      {
        "payment.providerOrderId": payment.order_id,
        paymentStatus: { $ne: "paid" },
      },
      {
        $set: {
          paymentStatus: "paid",
          "payment.providerPaymentId": payment.id,
          "payment.paidAt": new Date(),
        },
      },
    );
  } else if (event.event === "payment.failed") {
    await Order.updateOne(
      {
        "payment.providerOrderId": payment.order_id,
        paymentStatus: "unpaid",
      },
      {
        $set: {
          paymentStatus: "failed",
          "payment.providerPaymentId": payment.id,
        },
      },
    );
  }
};
