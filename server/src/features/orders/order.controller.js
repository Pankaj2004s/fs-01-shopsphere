import asyncHandler from "../../utils/asyncHandler.js";
import * as orderService from "./order.service.js";

export const place = asyncHandler(async (req, res) => {
  const order = await orderService.placeOrder(req.user._id);
  res.status(201).json({ order });
});

export const list = asyncHandler(async (req, res) => {
  const result = await orderService.listMyOrders(
    req.user._id,
    req.validated.query,
  );
  res.status(200).json(result);
});

export const getOne = asyncHandler(async (req, res) => {
  const order = await orderService.getMyOrder(
    req.user._id,
    req.validated.params.id,
  );
  res.status(200).json({ order });
});

export const listVendor = asyncHandler(async (req, res) => {
  const result = await orderService.listVendorOrders(
    req.user._id,
    req.validated.query,
  );
  res.status(200).json(result);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.user._id,
    req.validated.params.id,
    req.body.status,
  );
  res.status(200).json({ order });
});
