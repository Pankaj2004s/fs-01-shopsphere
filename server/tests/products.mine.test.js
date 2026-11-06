import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import Product from "../src/features/products/product.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory, createProduct } from "./helpers/catalogFactories.js";

const listMine = (token, queryString = "") =>
  request(app)
    .get(`/api/products/mine${queryString}`)
    .set("Authorization", `Bearer ${token}`);

describe("GET /api/products/mine", () => {
  beforeAll(async () => {
    await connectTestDB();
    await Product.init();
  });
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/products/mine");

    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const { token } = await createUser({ role: "customer" });

    const res = await listMine(token);

    expect(res.status).toBe(403);
  });

  it("returns an empty list when the vendor has no products", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await listMine(token);

    expect(res.status).toBe(200);
    expect(res.body.products).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it("returns only the logged-in vendor's products", async () => {
    const { user: me, token } = await createUser({ role: "vendor" });
    const { user: other } = await createUser({ role: "vendor" });
    const category = await createCategory();
    await createProduct({ name: "Mine", vendor: me._id, category: category._id });
    await createProduct({ name: "Theirs", vendor: other._id, category: category._id });

    const res = await listMine(token);

    expect(res.status).toBe(200);
    expect(res.body.products.map((p) => p.name)).toEqual(["Mine"]);
    expect(res.body.pagination.total).toBe(1);
  });

  it("counts and paginates only this vendor's products", async () => {
    const { user: me, token } = await createUser({ role: "vendor" });
    const { user: other } = await createUser({ role: "vendor" });
    const category = await createCategory();
    for (let i = 0; i < 5; i += 1) {
      await createProduct({ vendor: me._id, category: category._id });
    }
    for (let i = 0; i < 3; i += 1) {
      await createProduct({ vendor: other._id, category: category._id });
    }

    const page3 = await listMine(token, "?page=3&limit=2");

    expect(page3.body.products).toHaveLength(1);
    expect(page3.body.pagination).toEqual({
      page: 3,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it("applies search and category filters inside the vendor's products", async () => {
    const { user: me, token } = await createUser({ role: "vendor" });
    const { user: other } = await createUser({ role: "vendor" });
    const books = await createCategory({ name: "Books" });
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Cotton Novel", vendor: me._id, category: books._id });
    await createProduct({ name: "Cotton Robot", vendor: me._id, category: toys._id });
    await createProduct({ name: "Cotton Other", vendor: other._id, category: books._id });

    const bySearch = await listMine(token, "?search=cotton&sort=oldest");
    const byCategory = await listMine(token, `?category=${books._id}`);

    expect(bySearch.body.products.map((p) => p.name)).toEqual([
      "Cotton Novel",
      "Cotton Robot",
    ]);
    expect(byCategory.body.products.map((p) => p.name)).toEqual([
      "Cotton Novel",
    ]);
  });

  it("ignores a vendor id sent in the query string", async () => {
    const { user: me, token } = await createUser({ role: "vendor" });
    const { user: other } = await createUser({ role: "vendor" });
    const category = await createCategory();
    await createProduct({ name: "Mine", vendor: me._id, category: category._id });
    await createProduct({ name: "Theirs", vendor: other._id, category: category._id });

    const res = await listMine(token, `?vendor=${other._id}`);

    expect(res.status).toBe(200);
    expect(res.body.products.map((p) => p.name)).toEqual(["Mine"]);
  });

  it("returns 400 for an invalid query", async () => {
    const { token } = await createUser({ role: "vendor" });

    const res = await listMine(token, "?page=0");

    expect(res.status).toBe(400);
  });
});
