import Cart from "../cart/cart.model.js";
import Product from "../products/product.model.js";
import Order from "./order.model.js";
import ApiError from "../../utils/ApiError.js";

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
      throw new ApiError(400, "Some items in your cart are no longer available");
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