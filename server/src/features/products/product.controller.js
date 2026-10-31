import asyncHandler from "../../utils/asyncHandler.js";
import * as productService from "./product.service.js";

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user._id, req.body);
  res.status(201).json({ product });
});