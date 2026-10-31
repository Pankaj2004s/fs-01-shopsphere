import ApiError from "../../utils/ApiError.js";
import Category from "../categories/category.model.js";
import Product from "./product.model.js";

export const createProduct = async (vendorId, data) => {
  const categoryExists = await Category.exists({ _id: data.category });

  if (!categoryExists) {
    throw new ApiError(404, "Category not found");
  }

  const product = await Product.create({ ...data, vendor: vendorId });

  return product.populate([
    { path: "category", select: "name slug" },
    { path: "vendor", select: "name" },
  ]);
};
