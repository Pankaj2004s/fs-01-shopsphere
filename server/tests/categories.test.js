import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import Category from "../src/features/categories/category.model.js";
import { connectTestDB, clearDB, disconnectTestDB } from "./helpers/db.js";
import { createUser } from "./helpers/factories.js";
import { createCategory } from "./helpers/catalogFactories.js";

describe("categories API", () => {
  beforeAll(connectTestDB);
  afterEach(clearDB);
  afterAll(disconnectTestDB);

  describe("GET /api/categories", () => {
    it("returns an empty list when there are no categories", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.categories).toEqual([]);
    });

    it("is public and returns categories sorted by name", async () => {
      await createCategory({ name: "Zebra Toys" });
      await createCategory({ name: "Apple Gadgets" });

      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(res.body.categories.map((c) => c.name)).toEqual([
        "Apple Gadgets",
        "Zebra Toys",
      ]);
    });
  });

  describe("POST /api/categories", () => {
    it("returns 401 without a token", async () => {
      const res = await request(app)
        .post("/api/categories")
        .send({ name: "Books" });

      expect(res.status).toBe(401);
      expect(await Category.countDocuments()).toBe(0);
    });

    it.each(["customer", "vendor"])(
      "returns 403 for a %s",
      async (role) => {
        const { token } = await createUser({ role });

        const res = await request(app)
          .post("/api/categories")
          .set("Authorization", `Bearer ${token}`)
          .send({ name: "Books" });

        expect(res.status).toBe(403);
        expect(await Category.countDocuments()).toBe(0);
      },
    );

    it("lets an admin create a category with a generated slug", async () => {
      const { token } = await createUser({ role: "admin" });

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Home & Kitchen" });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe("Home & Kitchen");
      expect(res.body.category.slug).toBe("home-kitchen");
      expect(await Category.countDocuments()).toBe(1);
    });

    it("trims the name", async () => {
      const { token } = await createUser({ role: "admin" });

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "  Books  " });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe("Books");
    });

    it("returns 409 for a duplicate name in any letter case", async () => {
      const { token } = await createUser({ role: "admin" });
      await createCategory({ name: "Electronics" });

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "electronics" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Category already exists");
      expect(await Category.countDocuments()).toBe(1);
    });

    it.each([
      ["an empty name", { name: "" }],
      ["a missing name", {}],
    ])("returns 400 for %s", async (label, body) => {
      const { token } = await createUser({ role: "admin" });

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send(body);

      expect(res.status).toBe(400);
      expect(await Category.countDocuments()).toBe(0);
    });
  });
});