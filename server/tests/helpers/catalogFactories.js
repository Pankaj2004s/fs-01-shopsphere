import Category from "../../src/features/categories/category.model.js";
import Product from "../../src/features/products/product.model.js";
import { createUser } from "./factories.js";

let categoryCounter = 0;
let productCounter = 0;

export const createCategory = async (overrides = {}) => {
  categoryCounter += 1;

  return Category.create({
    name: `Category ${categoryCounter}`,
    ...overrides,
  });
};

export const createProduct = async (overrides = {}) => {
  productCounter += 1;

  const vendor =
    overrides.vendor ?? (await createUser({ role: "vendor" })).user._id;
  const category = overrides.category ?? (await createCategory())._id;

  return Product.create({
    name: `Product ${productCounter}`,
    price: 100,
    stock: 10,
    ...overrides,
    vendor,
    category,
  });
};