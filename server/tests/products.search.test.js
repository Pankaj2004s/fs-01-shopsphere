import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { es, closeElasticsearch } from "../src/config/elasticsearch.js";
import Cart from "../src/features/cart/cart.model.js";
import Product from "../src/features/products/product.model.js";
import {
  PRODUCT_INDEX,
  recreateProductIndex,
} from "../src/features/search/product.index.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory } from "./helpers/catalogFactories.js";

const bearer = (token) => `Bearer ${token}`;
const search = (queryString) => request(app).get(`/api/products${queryString}`);
const names = (res) => res.body.products.map((p) => p.name);

const setup = async () => {
  const { token } = await createUser({ role: "vendor", name: "Asha" });
  const category = await createCategory({ name: "Clothing" });
  return { token, category };
};

const addProduct = async (token, category, body) => {
  const res = await request(app)
    .post("/api/products")
    .set("Authorization", bearer(token))
    .send({ price: 100, ...body, category: category._id.toString() });

  expect(res.status).toBe(201);
  return res.body.product;
};

const indexedStock = async (id) => {
  const doc = await es.get({ index: PRODUCT_INDEX, id: String(id) });
  return doc._source.stock;
};

describe("product search (elasticsearch)", () => {
  beforeAll(async () => {
    env.searchEngine = "elasticsearch";
    await connectTestDB();
    await Product.init();
  });

  beforeEach(async () => {
    await recreateProductIndex();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearDB();
  });

  afterAll(async () => {
    env.searchEngine = "mongodb";
    await disconnectTestDB();
    await closeElasticsearch();
  });

  it("finds a product by a stemmed word", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Cotton Shirt" });
    await addProduct(token, category, { name: "Leather Wallet" });

    const res = await search("?search=shirts");

    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["Cotton Shirt"]);
    expect(res.body.pagination.total).toBe(1);
  });

  it("tolerates a small typo", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Mechanical Keyboard" });

    const res = await search("?search=keyborad");

    expect(names(res)).toEqual(["Mechanical Keyboard"]);
  });

  it("requires every word of the search", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Red Shirt" });
    await addProduct(token, category, { name: "Red Hat" });
    await addProduct(token, category, { name: "Blue Shirt" });

    const res = await search("?search=red%20shirt");

    expect(names(res)).toEqual(["Red Shirt"]);
  });

  it("filters by category together with the search", async () => {
    const { token, category } = await setup();
    const home = await createCategory({ name: "Home" });
    await addProduct(token, category, { name: "Cotton Shirt" });
    await addProduct(token, home, { name: "Shirt Hanger" });

    const res = await search(`?search=shirt&category=${home._id}`);

    expect(names(res)).toEqual(["Shirt Hanger"]);
  });

  it("filters by price together with the search", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Shirt A", price: 100 });
    await addProduct(token, category, { name: "Shirt B", price: 500 });

    const res = await search("?search=shirt&minPrice=200");

    expect(names(res)).toEqual(["Shirt B"]);
  });

  it("sorts the matches by price in both directions", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Shirt C", price: 300 });
    await addProduct(token, category, { name: "Shirt A", price: 100 });
    await addProduct(token, category, { name: "Shirt B", price: 200 });

    const asc = await search("?search=shirt&sort=price_asc");
    const desc = await search("?search=shirt&sort=price_desc");

    expect(names(asc)).toEqual(["Shirt A", "Shirt B", "Shirt C"]);
    expect(names(desc)).toEqual(["Shirt C", "Shirt B", "Shirt A"]);
  });

  it("paginates the matches", async () => {
    const { token, category } = await setup();
    for (let i = 1; i <= 5; i += 1) {
      await addProduct(token, category, {
        name: `Shirt ${i}`,
        price: i * 100,
      });
    }

    const res = await search("?search=shirt&sort=price_asc&page=3&limit=2");

    expect(names(res)).toEqual(["Shirt 5"]);
    expect(res.body.pagination).toEqual({
      page: 3,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it("returns category and vendor names like the normal list", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Cotton Shirt" });

    const res = await search("?search=shirt");

    expect(res.body.products[0].category.name).toBe("Clothing");
    expect(res.body.products[0].vendor.name).toBe("Asha");
  });

  it("finds a newly created product right away", async () => {
    const { token, category } = await setup();

    const before = await search("?search=shirt");
    await addProduct(token, category, { name: "Fresh Shirt" });
    const after = await search("?search=shirt");

    expect(names(before)).toEqual([]);
    expect(names(after)).toEqual(["Fresh Shirt"]);
  });

  it("finds an updated product by its new name only", async () => {
    const { token, category } = await setup();
    const product = await addProduct(token, category, { name: "Cotton Shirt" });

    const updated = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Authorization", bearer(token))
      .send({ name: "Leather Wallet" });
    const byNew = await search("?search=wallet");
    const byOld = await search("?search=shirt");

    expect(updated.status).toBe(200);
    expect(names(byNew)).toEqual(["Leather Wallet"]);
    expect(names(byOld)).toEqual([]);
  });

  it("stops finding a deleted product", async () => {
    const { token, category } = await setup();
    const product = await addProduct(token, category, { name: "Cotton Shirt" });

    const deleted = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Authorization", bearer(token));
    const after = await search("?search=shirt");

    expect(deleted.status).toBe(204);
    expect(names(after)).toEqual([]);
  });

  it("keeps the stock in the index in step with orders", async () => {
    const { token, category } = await setup();
    const product = await addProduct(token, category, {
      name: "Stock Shirt",
      stock: 10,
    });
    const { user: customer, token: customerToken } = await createUser();
    await Cart.create({
      user: customer._id,
      items: [{ product: product._id, quantity: 2 }],
    });

    const placed = await request(app)
      .post("/api/orders")
      .set("Authorization", bearer(customerToken));
    expect(placed.status).toBe(201);
    expect(await indexedStock(product._id)).toBe(8);

    const cancelled = await request(app)
      .patch(`/api/orders/${placed.body.order._id}/status`)
      .set("Authorization", bearer(customerToken))
      .send({ status: "cancelled" });
    expect(cancelled.status).toBe(200);
    expect(await indexedStock(product._id)).toBe(10);
  });

  it("falls back to MongoDB when elasticsearch fails", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Cotton Shirt" });
    await addProduct(token, category, { name: "Leather Wallet" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(es, "search").mockRejectedValue(new Error("es down"));

    const res = await search("?search=shirt");

    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["Cotton Shirt"]);
    expect(errorSpy.mock.calls[0][0]).toContain("Elasticsearch search failed");
  });

  it("does not ask elasticsearch for a list without a search", async () => {
    const { token, category } = await setup();
    await addProduct(token, category, { name: "Cotton Shirt" });
    const searchSpy = vi
      .spyOn(es, "search")
      .mockRejectedValue(new Error("es down"));

    const res = await search("");

    expect(res.status).toBe(200);
    expect(names(res)).toEqual(["Cotton Shirt"]);
    expect(searchSpy).not.toHaveBeenCalled();
  });
});
