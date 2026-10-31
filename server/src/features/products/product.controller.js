import asyncHandler from "../../utils/asyncHandler.js";
import * as productService from "./product.service.js";

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.user._id, req.body);
  res.status(201).json({ product });
});

export const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.validated.params.id);
  res.status(200).json({ product });
});

export const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.validated.query);
  res.status(200).json(result);
});
