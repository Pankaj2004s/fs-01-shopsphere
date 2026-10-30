import ApiError from "../../utils/ApiError.js";
import Category from "./category.model.js";

export const createCategory = async ({ name }) => {
  const existing = await Category.findOne({ name }).collation({
    locale: "en",
    strength: 2,
  });

  if (existing) {
    throw new ApiError(409, "Category already exists");
  }

  return Category.create({ name });
};

export const listCategories = async () => {
  return Category.find().sort({ name: 1 });
};
