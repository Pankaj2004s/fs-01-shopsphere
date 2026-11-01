import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Cart from "../src/features/cart/cart.model.js";
import Order from "../src/features/orders/order.model.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createProduct } from "./helpers/catalogFactories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const makeProduct = (overrides = {}) =>
  createProduct({ vendor: randomId(), category: randomId(), ...overrides });

const fillCart = (userId, lines) =>
  Cart.create({
    user: userId,
    items: lines.map(({ product, quantity }) => ({
      product: product._id,
      quantity,
    })),
  });

const placeOrder = (token) =>
  request(app).post("/api/orders").set("Authorization", bearer(token));

describe("POST /api/orders", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/orders");

    expect(res.status).toBe(401);
  });

  it("returns 400 when the user has no cart", async () => {
    const { token } = await createUser();

    const res = await placeOrder(token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
    expect(await Order.countDocuments()).toBe(0);
  });

  it("creates an order, reserves stock and empties the cart", async () => {
    const { user, token } = await createUser();
    const vendorId = randomId();
    const product = await makeProduct({
      name: "Cotton T-Shirt",
      price: 499,
      stock: 10,
      vendor: vendorId,
    });
    await fillCart(user._id, [{ product, quantity: 2 }]);

    const res = await placeOrder(token);

    expect(res.status).toBe(201);
    expect(res.body.order.user).toBe(user._id.toString());
    expect(res.body.order.status).toBe("pending");
    expect(res.body.order.totalAmount).toBe(998);
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.order.items[0]).toMatchObject({
      product: product._id.toString(),
      vendor: vendorId.toString(),
      name: "Cotton T-Shirt",
      price: 499,
      quantity: 2,
    });

    const stored = await Product.findById(product._id);
    expect(stored.stock).toBe(8);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart.items).toHaveLength(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("calculates the total across several products", async () => {
    const { user, token } = await createUser();
    const shirt = await makeProduct({ price: 100, stock: 10 });
    const cap = await makeProduct({ price: 50, stock: 10 });
    await fillCart(user._id, [
      { product: shirt, quantity: 2 },
      { product: cap, quantity: 3 },
    ]);

    const res = await placeOrder(token);

    expect(res.status).toBe(201);
    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.order.totalAmount).toBe(350);
    expect((await Product.findById(shirt._id)).stock).toBe(8);
    expect((await Product.findById(cap._id)).stock).toBe(7);
  });

  it("keeps the old price in the order after the product price changes", async () => {
    const { user, token } = await createUser();
    const product = await makeProduct({ price: 100, stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    await placeOrder(token);

    await Product.updateOne({ _id: product._id }, { price: 999 });

    const order = await Order.findOne();
    expect(order.items[0].price).toBe(100);
    expect(order.totalAmount).toBe(100);
  });

  it("returns 400 when the cart is already empty after a successful order", async () => {
    const { user, token } = await createUser();
    const product = await makeProduct({ stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const first = await placeOrder(token);

    const second = await placeOrder(token);

    expect(first.status).toBe(201);
    expect(second.status).toBe(400);
    expect(second.body.message).toBe("Cart is empty");
    expect(await Order.countDocuments()).toBe(1);
  });

  it("returns 400 when a product in the cart was deleted", async () => {
    const { user, token } = await createUser();
    const product = await makeProduct({ stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    await Product.deleteOne({ _id: product._id });

    const res = await placeOrder(token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Some items in your cart are no longer available",
    );
    expect(await Order.countDocuments()).toBe(0);
  });

  it("returns 400 when a vendor buys their own product", async () => {
    const { user: vendor, token } = await createUser({ role: "vendor" });
    const product = await makeProduct({ vendor: vendor._id, stock: 5 });
    await fillCart(vendor._id, [{ product, quantity: 1 }]);

    const res = await placeOrder(token);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("You cannot buy your own product");
    expect((await Product.findById(product._id)).stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("returns 409 when stock dropped below the cart quantity, and changes nothing", async () => {
    const { user, token } = await createUser();
    const product = await makeProduct({ name: "Limited Shirt", stock: 2 });
    await fillCart(user._id, [{ product, quantity: 2 }]);
    await Product.updateOne({ _id: product._id }, { stock: 1 });

    const res = await placeOrder(token);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Insufficient stock for Limited Shirt");
    expect((await Product.findById(product._id)).stock).toBe(1);
    expect(await Order.countDocuments()).toBe(0);

    const cart = await Cart.findOne({ user: user._id });
    expect(cart.items).toHaveLength(1);
  });

  it("rolls back stock of earlier lines when a later line fails", async () => {
    const { user, token } = await createUser();
    const first = await makeProduct({ name: "First", stock: 5 });
    const second = await makeProduct({ name: "Second", stock: 3 });
    await fillCart(user._id, [
      { product: first, quantity: 2 },
      { product: second, quantity: 3 },
    ]);
    await Product.updateOne({ _id: second._id }, { stock: 1 });

    const res = await placeOrder(token);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Insufficient stock for Second");
    expect((await Product.findById(first._id)).stock).toBe(5);
    expect((await Product.findById(second._id)).stock).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("lets only one of two simultaneous buyers get the last item", async () => {
    const { user: alice, token: aliceToken } = await createUser();
    const { user: bob, token: bobToken } = await createUser();
    const product = await makeProduct({ name: "Last Item", stock: 1 });
    await fillCart(alice._id, [{ product, quantity: 1 }]);
    await fillCart(bob._id, [{ product, quantity: 1 }]);

    const [a, b] = await Promise.all([
      placeOrder(aliceToken),
      placeOrder(bobToken),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);

    const loser = a.status === 409 ? a : b;
    expect(loser.body.message).toBe("Insufficient stock for Last Item");
    expect((await Product.findById(product._id)).stock).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });
});
