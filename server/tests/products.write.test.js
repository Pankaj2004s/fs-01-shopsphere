import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory, createProduct } from "./helpers/catalogFactories.js";

const randomId = () => new mongoose.Types.ObjectId();
const bearer = (token) => `Bearer ${token}`;

const createVendorWithProduct = async (productOverrides = {}) => {
  const { user: vendor, token } = await createUser({ role: "vendor" });
  const product = await createProduct({
    name: "Old Name",
    price: 100,
    stock: 10,
    ...productOverrides,
    vendor: vendor._id,
  });

  return { vendor, token, product };
};

describe("products API (write)", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("POST /api/products", () => {
    const base = {
      name: "Cotton T-Shirt",
      price: 499,
      category: randomId().toString(),
    };

    it("returns 401 without a token", async () => {
      const res = await request(app).post("/api/products").send(base);

      expect(res.status).toBe(401);
      expect(await Product.countDocuments()).toBe(0);
    });

    it("returns 403 for a customer", async () => {
      const { token } = await createUser({ role: "customer" });

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send(base);

      expect(res.status).toBe(403);
      expect(await Product.countDocuments()).toBe(0);
    });

    it("lets a vendor create a product owned by them", async () => {
      const { token } = await createUser({ role: "vendor", name: "Asha" });
      const category = await createCategory({ name: "Clothing" });

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send({ ...base, stock: 20, category: category._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.product.name).toBe("Cotton T-Shirt");
      expect(res.body.product.price).toBe(499);
      expect(res.body.product.stock).toBe(20);
      expect(res.body.product.vendor.name).toBe("Asha");
      expect(res.body.product.category.slug).toBe("clothing");
      expect(await Product.countDocuments()).toBe(1);
    });

    it("applies defaults for stock, description and images", async () => {
      const { token } = await createUser({ role: "vendor" });
      const category = await createCategory();

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send({ ...base, category: category._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.product.stock).toBe(0);
      expect(res.body.product.description).toBe("");
      expect(res.body.product.images).toEqual([]);
    });

    it("lets an admin create a product too", async () => {
      const { token } = await createUser({ role: "admin" });
      const category = await createCategory();

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send({ ...base, category: category._id.toString() });

      expect(res.status).toBe(201);
    });

    it("ignores a vendor id sent by the client", async () => {
      const { user: vendor, token } = await createUser({ role: "vendor" });
      const category = await createCategory();

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send({
          ...base,
          category: category._id.toString(),
          vendor: randomId().toString(),
        });

      expect(res.status).toBe(201);

      const saved = await Product.findOne();
      expect(saved.vendor.toString()).toBe(vendor._id.toString());
    });

    it("returns 404 when the category does not exist", async () => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send(base);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
      expect(await Product.countDocuments()).toBe(0);
    });

    it.each([
      ["a missing name", { price: 100, category: base.category }],
      ["a negative price", { ...base, price: -1 }],
      ["a price sent as a string", { ...base, price: "100" }],
      ["a fractional stock", { ...base, stock: 1.5 }],
      ["a negative stock", { ...base, stock: -1 }],
      ["an invalid image url", { ...base, images: ["not-a-url"] }],
      [
        "more than 5 images",
        { ...base, images: Array(6).fill("https://example.com/a.jpg") },
      ],
      ["a malformed category id", { ...base, category: "abc" }],
    ])("returns 400 for %s", async (label, body) => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", bearer(token))
        .send(body);

      expect(res.status).toBe(400);
      expect(await Product.countDocuments()).toBe(0);
    });
  });

  describe("PATCH /api/products/:id", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .patch(`/api/products/${randomId()}`)
        .send({ name: "X" });

      expect(res.status).toBe(401);
    });

    it("returns 403 for a customer, before any database lookup", async () => {
      const { token } = await createUser({ role: "customer" });

      const res = await request(app)
        .patch(`/api/products/${randomId()}`)
        .set("Authorization", bearer(token))
        .send({ name: "X" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden, you do not have permission");
    });

    it("lets the owner update some fields and keeps the rest", async () => {
      const { token, product } = await createVendorWithProduct();

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(token))
        .send({ name: "New Name", price: 250 });

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe("New Name");
      expect(res.body.product.price).toBe(250);
      expect(res.body.product.stock).toBe(10);

      const saved = await Product.findById(product._id);
      expect(saved.name).toBe("New Name");
      expect(saved.price).toBe(250);
    });

    it("returns 403 when another vendor tries to update it", async () => {
      const { product } = await createVendorWithProduct();
      const { token: otherToken } = await createUser({ role: "vendor" });

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(otherToken))
        .send({ name: "Hacked" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You can only modify your own products");

      const saved = await Product.findById(product._id);
      expect(saved.name).toBe("Old Name");
    });

    it("lets an admin update any product without changing its owner", async () => {
      const { vendor, product } = await createVendorWithProduct();
      const { token: adminToken } = await createUser({ role: "admin" });

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(adminToken))
        .send({ name: "Admin Edit" });

      expect(res.status).toBe(200);

      const saved = await Product.findById(product._id);
      expect(saved.name).toBe("Admin Edit");
      expect(saved.vendor.toString()).toBe(vendor._id.toString());
    });

    it("returns 404 when the product does not exist", async () => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .patch(`/api/products/${randomId()}`)
        .set("Authorization", bearer(token))
        .send({ name: "X" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });

    it("returns 404 when the new category does not exist", async () => {
      const { token, product } = await createVendorWithProduct();

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(token))
        .send({ category: randomId().toString() });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");

      const saved = await Product.findById(product._id);
      expect(saved.category.toString()).toBe(product.category.toString());
    });

    it("ignores a vendor id sent by the client", async () => {
      const { vendor, token, product } = await createVendorWithProduct();

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(token))
        .send({ name: "Renamed", vendor: randomId().toString() });

      expect(res.status).toBe(200);

      const saved = await Product.findById(product._id);
      expect(saved.name).toBe("Renamed");
      expect(saved.vendor.toString()).toBe(vendor._id.toString());
    });

    it("returns 400 for an empty body", async () => {
      const { token, product } = await createVendorWithProduct();

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(token))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("At least one field is required to update");
    });

    it("returns 400 for a malformed id", async () => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .patch("/api/products/not-an-id")
        .set("Authorization", bearer(token))
        .send({ name: "X" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid id");
    });

    it("returns 400 for an invalid field and leaves the product unchanged", async () => {
      const { token, product } = await createVendorWithProduct();

      const res = await request(app)
        .patch(`/api/products/${product._id}`)
        .set("Authorization", bearer(token))
        .send({ price: -5 });

      expect(res.status).toBe(400);

      const saved = await Product.findById(product._id);
      expect(saved.price).toBe(100);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app).delete(`/api/products/${randomId()}`);

      expect(res.status).toBe(401);
    });

    it("returns 403 for a customer", async () => {
      const { token } = await createUser({ role: "customer" });

      const res = await request(app)
        .delete(`/api/products/${randomId()}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(403);
    });

    it("lets the owner delete it, and it is gone afterwards", async () => {
      const { token, product } = await createVendorWithProduct();

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      expect(await Product.countDocuments()).toBe(0);

      const after = await request(app).get(`/api/products/${product._id}`);
      expect(after.status).toBe(404);
    });

    it("returns 403 when another vendor tries to delete it", async () => {
      const { product } = await createVendorWithProduct();
      const { token: otherToken } = await createUser({ role: "vendor" });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set("Authorization", bearer(otherToken));

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("You can only modify your own products");
      expect(await Product.countDocuments()).toBe(1);
    });

    it("lets an admin delete any product", async () => {
      const { product } = await createVendorWithProduct();
      const { token: adminToken } = await createUser({ role: "admin" });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set("Authorization", bearer(adminToken));

      expect(res.status).toBe(204);
      expect(await Product.countDocuments()).toBe(0);
    });

    it("returns 404 when the product does not exist", async () => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .delete(`/api/products/${randomId()}`)
        .set("Authorization", bearer(token));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });

    it("returns 400 for a malformed id", async () => {
      const { token } = await createUser({ role: "vendor" });

      const res = await request(app)
        .delete("/api/products/not-an-id")
        .set("Authorization", bearer(token));

      expect(res.status).toBe(400);
    });
  });
});
