import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Cart from "../src/features/cart/cart.model.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createProduct } from "./helpers/catalogFactories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const makeProduct = (overrides = {}) =>
  createProduct({ vendor: randomId(), category: randomId(), ...overrides });

const addToCart = (token, body) =>
  request(app)
    .post("/api/cart/items")
    .set("Authorization", bearer(token))
    .send(body);

const viewCart = (token) =>
  request(app).get("/api/cart").set("Authorization", bearer(token));

describe("cart API", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("authentication", () => {
    const someId = "507f1f77bcf86cd799439011";

    it.each([
      ["GET /api/cart", "get", "/api/cart"],
      ["POST /api/cart/items", "post", "/api/cart/items"],
      [
        "PATCH /api/cart/items/:productId",
        "patch",
        `/api/cart/items/${someId}`,
      ],
      [
        "DELETE /api/cart/items/:productId",
        "delete",
        `/api/cart/items/${someId}`,
      ],
    ])("returns 401 for %s without a token", async (label, method, path) => {
      const res = await request(app)[method](path);

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/cart", () => {
    it("returns an empty cart for a user who never added anything", async () => {
      const { token } = await createUser();

      const res = await viewCart(token);

      expect(res.status).toBe(200);
      expect(res.body.cart).toEqual({ items: [], total: 0 });
    });

    it("returns lines with lineTotal and a correct total", async () => {
      const { token } = await createUser();
      const shirt = await makeProduct({ name: "Shirt", price: 100 });
      const cap = await makeProduct({ name: "Cap", price: 50 });
      await addToCart(token, { productId: shirt._id.toString(), quantity: 2 });
      await addToCart(token, { productId: cap._id.toString(), quantity: 3 });

      const res = await viewCart(token);

      expect(res.status).toBe(200);
      expect(res.body.cart.items).toHaveLength(2);
      expect(res.body.cart.items[0].product.name).toBe("Shirt");
      expect(res.body.cart.items[0].lineTotal).toBe(200);
      expect(res.body.cart.items[1].lineTotal).toBe(150);
      expect(res.body.cart.total).toBe(350);
    });

    it("hides a line whose product was deleted, without crashing", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ price: 100 });
      await addToCart(token, {
        productId: product._id.toString(),
        quantity: 1,
      });
      await Product.deleteOne({ _id: product._id });

      const res = await viewCart(token);

      expect(res.status).toBe(200);
      expect(res.body.cart).toEqual({ items: [], total: 0 });

      const stored = await Cart.findOne();
      expect(stored.items).toHaveLength(1);
    });

    it("never shows another user's cart", async () => {
      const { token: aliceToken } = await createUser();
      const { token: bobToken } = await createUser();
      const product = await makeProduct();
      await addToCart(aliceToken, {
        productId: product._id.toString(),
        quantity: 1,
      });

      const res = await viewCart(bobToken);

      expect(res.body.cart).toEqual({ items: [], total: 0 });
    });
  });

  describe("POST /api/cart/items", () => {
    it("uses quantity 1 when none is sent", async () => {
      const { token } = await createUser();
      const product = await makeProduct();

      const res = await addToCart(token, { productId: product._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.cart.items).toHaveLength(1);
      expect(res.body.cart.items[0].quantity).toBe(1);
    });

    it("adds a product and returns it populated with lineTotal", async () => {
      const { token } = await createUser();
      const product = await makeProduct({
        name: "Cotton T-Shirt",
        price: 499,
        stock: 10,
      });

      const res = await addToCart(token, {
        productId: product._id.toString(),
        quantity: 2,
      });

      const [line] = res.body.cart.items;
      expect(res.status).toBe(200);
      expect(line.product.name).toBe("Cotton T-Shirt");
      expect(line.product.price).toBe(499);
      expect(line.quantity).toBe(2);
      expect(line.lineTotal).toBe(998);
      expect(res.body.cart.total).toBe(998);
    });

    it("adds to the existing line when the same product is added again", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ stock: 10 });
      const productId = product._id.toString();
      await addToCart(token, { productId, quantity: 2 });

      const res = await addToCart(token, { productId, quantity: 3 });

      expect(res.body.cart.items).toHaveLength(1);
      expect(res.body.cart.items[0].quantity).toBe(5);
      expect(await Cart.countDocuments()).toBe(1);
    });

    it("allows a quantity equal to the stock", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ stock: 3 });

      const res = await addToCart(token, {
        productId: product._id.toString(),
        quantity: 3,
      });

      expect(res.status).toBe(200);
      expect(res.body.cart.items[0].quantity).toBe(3);
    });

    it("returns 400 when the total in the cart would exceed the stock", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ stock: 5 });
      const productId = product._id.toString();
      await addToCart(token, { productId, quantity: 3 });

      const res = await addToCart(token, { productId, quantity: 3 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only 5 item(s) in stock");

      const stored = await Cart.findOne();
      expect(stored.items[0].quantity).toBe(3);
    });

    it("returns 400 for a product with no stock and creates no cart", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ stock: 0 });

      const res = await addToCart(token, {
        productId: product._id.toString(),
        quantity: 1,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only 0 item(s) in stock");
      expect(await Cart.countDocuments()).toBe(0);
    });

    it("returns 404 for a product that does not exist", async () => {
      const { token } = await createUser();

      const res = await addToCart(token, {
        productId: randomId().toString(),
        quantity: 1,
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });

    const validId = "507f1f77bcf86cd799439011";

    it.each([
      ["a missing productId", { quantity: 1 }],
      ["a malformed productId", { productId: "abc", quantity: 1 }],
      ["quantity 0", { productId: validId, quantity: 0 }],
      ["quantity above 99", { productId: validId, quantity: 100 }],
      ["a fractional quantity", { productId: validId, quantity: 1.5 }],
      ["a quantity sent as a string", { productId: validId, quantity: "2" }],
    ])("returns 400 for %s and creates no cart", async (label, body) => {
      const { token } = await createUser();

      const res = await addToCart(token, body);

      expect(res.status).toBe(400);
      expect(await Cart.countDocuments()).toBe(0);
    });
  });

  describe("PATCH /api/cart/items/:productId", () => {
    it("sets the quantity instead of adding to it", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ price: 100, stock: 10 });
      const productId = product._id.toString();
      await addToCart(token, { productId, quantity: 2 });

      const res = await request(app)
        .patch(`/api/cart/items/${productId}`)
        .set("Authorization", bearer(token))
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.cart.items[0].quantity).toBe(5);
      expect(res.body.cart.total).toBe(500);
    });

    it("returns 400 above the stock and leaves the quantity unchanged", async () => {
      const { token } = await createUser();
      const product = await makeProduct({ stock: 5 });
      const productId = product._id.toString();
      await addToCart(token, { productId, quantity: 2 });

      const res = await request(app)
        .patch(`/api/cart/items/${productId}`)
        .set("Authorization", bearer(token))
        .send({ quantity: 6 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Only 5 item(s) in stock");

      const stored = await Cart.findOne();
      expect(stored.items[0].quantity).toBe(2);
    });

    it("returns 404 when the product exists but is not in the cart", async () => {
      const { token } = await createUser();
      const product = await makeProduct();

      const res = await request(app)
        .patch(`/api/cart/items/${product._id}`)
        .set("Authorization", bearer(token))
        .send({ quantity: 2 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Item not found in cart");
    });

    it("returns 404 when the product does not exist", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .patch(`/api/cart/items/${randomId()}`)
        .set("Authorization", bearer(token))
        .send({ quantity: 2 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });

    it("returns 400 for quantity 0", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .patch(`/api/cart/items/${randomId()}`)
        .set("Authorization", bearer(token))
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
    });

    it("returns 400 for a malformed product id", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .patch("/api/cart/items/not-an-id")
        .set("Authorization", bearer(token))
        .send({ quantity: 2 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid id");
    });
  });

  describe("DELETE /api/cart/items/:productId", () => {
    it("removes only the chosen line", async () => {
      const { token } = await createUser();
      const a = await makeProduct({ name: "A" });
      const b = await makeProduct({ name: "B" });
      await addToCart(token, { productId: a._id.toString(), quantity: 1 });
      await addToCart(token, { productId: b._id.toString(), quantity: 1 });

      const res = await request(app)
        .delete(`/api/cart/items/${a._id}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(200);
      expect(res.body.cart.items.map((line) => line.product.name)).toEqual([
        "B",
      ]);
    });

    it("is idempotent: deleting the same line twice still returns 200", async () => {
      const { token } = await createUser();
      const product = await makeProduct();
      await addToCart(token, {
        productId: product._id.toString(),
        quantity: 1,
      });

      const first = await request(app)
        .delete(`/api/cart/items/${product._id}`)
        .set("Authorization", bearer(token));
      const second = await request(app)
        .delete(`/api/cart/items/${product._id}`)
        .set("Authorization", bearer(token));

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body.cart).toEqual({ items: [], total: 0 });
    });

    it("does not touch another user's cart", async () => {
      const { token: aliceToken } = await createUser();
      const { token: bobToken } = await createUser();
      const product = await makeProduct();
      await addToCart(aliceToken, {
        productId: product._id.toString(),
        quantity: 1,
      });

      await request(app)
        .delete(`/api/cart/items/${product._id}`)
        .set("Authorization", bearer(bobToken));

      const res = await viewCart(aliceToken);
      expect(res.body.cart.items).toHaveLength(1);
    });

    it("returns 400 for a malformed product id", async () => {
      const { token } = await createUser();

      const res = await request(app)
        .delete("/api/cart/items/not-an-id")
        .set("Authorization", bearer(token));

      expect(res.status).toBe(400);
    });
  });
});
