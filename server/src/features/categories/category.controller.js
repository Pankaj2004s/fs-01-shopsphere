import asyncHandler from "../../utils/asyncHandler.js";
import * as categoryService from "./category.service.js";

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ category });
});

export const list = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories();
  res.status(200).json({ categories });
});
