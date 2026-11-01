import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory, createProduct } from "./helpers/catalogFactories.js";

describe("products API (read)", () => {
  beforeAll(async () => {
    await connectTestDB();
    await Product.init();
  });
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("GET /api/products", () => {
    it("returns an empty list with pagination when there are no products", async () => {
      const res = await request(app).get("/api/products");

      expect(res.status).toBe(200);
      expect(res.body.products).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it("is public and populates category and vendor name only", async () => {
      const { user: vendor } = await createUser({
        role: "vendor",
        name: "Asha",
      });
      const category = await createCategory({ name: "Books" });
      await createProduct({ vendor: vendor._id, category: category._id });

      const res = await request(app).get("/api/products");

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].category.slug).toBe("books");
      expect(res.body.products[0].vendor.name).toBe("Asha");
      expect(res.body.products[0].vendor.email).toBeUndefined();
    });

    it("sorts newest first by default", async () => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const category = await createCategory();
      for (const name of ["First", "Second", "Third"]) {
        await createProduct({ name, vendor: vendor._id, category: category._id });
      }

      const res = await request(app).get("/api/products");

      expect(res.body.products.map((p) => p.name)).toEqual([
        "Third",
        "Second",
        "First",
      ]);
    });

    it("paginates with page and limit", async () => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const category = await createCategory();
      for (let i = 0; i < 5; i += 1) {
        await createProduct({ vendor: vendor._id, category: category._id });
      }

      const page2 = await request(app).get("/api/products?page=2&limit=2");
      const page3 = await request(app).get("/api/products?page=3&limit=2");

      expect(page2.body.products).toHaveLength(2);
      expect(page2.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
      expect(page3.body.products).toHaveLength(1);
    });

    it.each([
      ["price_asc", [100, 200, 300]],
      ["price_desc", [300, 200, 100]],
    ])("sorts by %s", async (sort, expectedPrices) => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const category = await createCategory();
      for (const price of [300, 100, 200]) {
        await createProduct({ price, vendor: vendor._id, category: category._id });
      }

      const res = await request(app).get(`/api/products?sort=${sort}`);

      expect(res.body.products.map((p) => p.price)).toEqual(expectedPrices);
    });

    it("filters by category", async () => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const books = await createCategory({ name: "Books" });
      const toys = await createCategory({ name: "Toys" });
      await createProduct({ name: "Novel", vendor: vendor._id, category: books._id });
      await createProduct({ name: "Robot", vendor: vendor._id, category: toys._id });

      const res = await request(app).get(`/api/products?category=${books._id}`);

      expect(res.body.products.map((p) => p.name)).toEqual(["Novel"]);
      expect(res.body.pagination.total).toBe(1);
    });

    it("filters by price range, both ends inclusive", async () => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const category = await createCategory();
      for (const price of [50, 100, 200, 300]) {
        await createProduct({ price, vendor: vendor._id, category: category._id });
      }

      const res = await request(app).get(
        "/api/products?minPrice=100&maxPrice=200&sort=price_asc",
      );

      expect(res.body.products.map((p) => p.price)).toEqual([100, 200]);
    });

    it("searches by text in the name", async () => {
      const { user: vendor } = await createUser({ role: "vendor" });
      const category = await createCategory();
      await createProduct({
        name: "Cotton T-Shirt",
        vendor: vendor._id,
        category: category._id,
      });
      await createProduct({
        name: "Running Shoes",
        vendor: vendor._id,
        category: category._id,
      });

      const res = await request(app).get("/api/products?search=cotton");

      expect(res.body.products.map((p) => p.name)).toEqual(["Cotton T-Shirt"]);
    });

    it.each([
      ["page 0", "page=0"],
      ["limit above 50", "limit=51"],
      ["an unknown sort", "sort=cheapest"],
      ["minPrice above maxPrice", "minPrice=500&maxPrice=100"],
      ["a malformed category id", "category=abc"],
    ])("returns 400 for %s", async (label, queryString) => {
      const res = await request(app).get(`/api/products?${queryString}`);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/products/:id", () => {
    it("returns one product with category and vendor populated", async () => {
      const { user: vendor } = await createUser({
        role: "vendor",
        name: "Ravi",
      });
      const category = await createCategory({ name: "Shoes" });
      const product = await createProduct({
        name: "Running Shoes",
        vendor: vendor._id,
        category: category._id,
      });

      const res = await request(app).get(`/api/products/${product._id}`);

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe("Running Shoes");
      expect(res.body.product.category.name).toBe("Shoes");
      expect(res.body.product.vendor.name).toBe("Ravi");
    });

    it("returns 404 for a valid id that does not exist", async () => {
      const missingId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/api/products/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });

    it("returns 400 for a malformed id", async () => {
      const res = await request(app).get("/api/products/not-an-id");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid id");
    });
  });
});