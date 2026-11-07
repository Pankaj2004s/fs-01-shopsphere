import ApiError from "../../utils/ApiError.js";
import Category from "./category.model.js";
import { getOrSet, invalidate } from "../../utils/cache.js";

const CATEGORIES_NAMESPACE = "categories";
const CATEGORIES_TTL_SECONDS = 300;

export const createCategory = async ({ name }) => {
  const existing = await Category.findOne({ name }).collation({
    locale: "en",
    strength: 2,
  });

  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  const category = await Category.create({ name });
  await invalidate(CATEGORIES_NAMESPACE);

  return category;
};

export const listCategories = async () => {
  return getOrSet(
    CATEGORIES_NAMESPACE,
    {},
    CATEGORIES_TTL_SECONDS,
    () => Category.find().sort({ name: 1 }),
  );
};
