import asyncHandler from "../../utils/asyncHandler.js";
import * as orderService from "./order.service.js";

export const place = asyncHandler(async (req, res) => {
  const order = await orderService.placeOrder(req.user._id);
  res.status(201).json({ order });
});