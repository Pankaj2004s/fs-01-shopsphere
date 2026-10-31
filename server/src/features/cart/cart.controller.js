import asyncHandler from "../../utils/asyncHandler.js";
import * as cartService from "./cart.service.js";

export const view = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  res.status(200).json({ cart });
});

export const add = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user._id, req.body);
  res.status(200).json({ cart });
});

export const update = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(
    req.user._id,
    req.validated.params.productId,
    req.body.quantity,
  );
  res.status(200).json({ cart });
});

export const remove = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(
    req.user._id,
    req.validated.params.productId,
  );
  res.status(200).json({ cart });
});