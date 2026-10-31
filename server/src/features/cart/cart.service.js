import Cart from "./cart.model.js";
import Product from "../products/product.model.js";
import ApiError from "../../utils/ApiError.js";

const cartPopulate = {
  path: "items.product",
  select: "name price stock images",
};

const buildCartView = (cart) => {
  const items = cart.items
    .filter((item) => item.product)
    .map((item) => ({
      product: item.product,
      quantity: item.quantity,
      lineTotal: item.product.price * item.quantity,
    }));

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return { items, total };
};

export const getCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate(cartPopulate);
  return buildCartView(cart ?? { items: [] });
};

export const addItem = async (userId, { productId, quantity }) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const cart =
    (await Cart.findOne({ user: userId })) ?? new Cart({ user: userId });

  const existing = cart.items.find((item) => item.product.equals(productId));
  const newQuantity = (existing?.quantity ?? 0) + quantity;

  if (newQuantity > product.stock) {
    throw new ApiError(400, `Only ${product.stock} item(s) in stock`);
  }

  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  return getCart(userId);
};

export const updateItem = async (userId, productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (quantity > product.stock) {
    throw new ApiError(400, `Only ${product.stock} item(s) in stock`);
  }

  const cart = await Cart.findOneAndUpdate(
    { user: userId, "items.product": productId },
    { $set: { "items.$.quantity": quantity } },
    { runValidators: true },
  );

  if (!cart) {
    throw new ApiError(404, "Item not found in cart");
  }

  return getCart(userId);
};

export const removeItem = async (userId, productId) => {
  await Cart.updateOne(
    { user: userId },
    { $pull: { items: { product: productId } } },
  );

  return getCart(userId);
};
