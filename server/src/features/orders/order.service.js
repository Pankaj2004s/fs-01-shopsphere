import Cart from "../cart/cart.model.js";
import Product from "../products/product.model.js";
import Order from "./order.model.js";
import ApiError from "../../utils/ApiError.js";
import { canActorSet, canTransition } from "./order.transitions.js";

const releaseStock = async (reserved) => {
  await Promise.all(
    reserved.map(({ product, quantity }) =>
      Product.updateOne({ _id: product }, { $inc: { stock: quantity } }),
    ),
  );
};

export const placeOrder = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name price vendor",
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const items = [];
  for (const item of cart.items) {
    if (!item.product) {
      throw new ApiError(
        400,
        "Some items in your cart are no longer available",
      );
    }
    if (item.product.vendor.equals(userId)) {
      throw new ApiError(400, "You cannot buy your own product");
    }
    items.push({
      product: item.product._id,
      vendor: item.product.vendor,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    });
  }

  const reserved = [];
  let order;

  try {
    for (const item of items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
      );

      if (result.modifiedCount !== 1) {
        throw new ApiError(409, `Insufficient stock for ${item.name}`);
      }
      reserved.push(item);
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    order = await Order.create({ user: userId, items, totalAmount });
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }

  await Cart.updateOne({ user: userId }, { $set: { items: [] } });

  return order;
};

export const listMyOrders = async (userId, { page, limit, status }) => {
  const filter = { user: userId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getMyOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  return order;
};

const toVendorView = (order, vendorId) => {
  const items = order.items.filter((item) => item.vendor.equals(vendorId));
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return {
    _id: order._id,
    customer: order.user,
    status: order.status,
    createdAt: order.createdAt,
    items,
    subtotal,
  };
};

export const listVendorOrders = async (vendorId, { page, limit, status }) => {
  const filter = { "items.vendor": vendorId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name"),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map((order) => toVendorView(order, vendorId)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const updateOrderStatus = async (userId, orderId, newStatus) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const isCustomer = order.user.equals(userId);
  const isVendor = order.items.some((item) => item.vendor.equals(userId));
  if (!isCustomer && !isVendor) {
    throw new ApiError(404, "Order not found");
  }

  const actor = isCustomer ? "customer" : "vendor";

  if (!canActorSet(actor, newStatus)) {
    throw new ApiError(403, `You cannot set status to ${newStatus}`);
  }

  if (!canTransition(order.status, newStatus)) {
    throw new ApiError(
      409,
      `Cannot change status from ${order.status} to ${newStatus}`,
    );
  }

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: order.status },
    { $set: { status: newStatus } },
    { returnDocument: "after" },
  );

  if (!updated) {
    throw new ApiError(409, "Order was changed by someone else, please retry");
  }

  if (newStatus === "cancelled") {
    await releaseStock(updated.items);
  }

  if (actor === "vendor") {
    await updated.populate("user", "name");
    return toVendorView(updated, userId);
  }

  return updated;
};
