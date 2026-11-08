import asyncHandler from "../../utils/asyncHandler.js";
import * as paymentService from "./payment.service.js";

export const create = asyncHandler(async (req, res) => {
  const payment = await paymentService.createPayment(
    req.user._id,
    req.validated.params.id,
  );
  res.status(201).json({ payment });
});

export const confirm = asyncHandler(async (req, res) => {
  const order = await paymentService.confirmPayment(
    req.user._id,
    req.validated.params.id,
    req.body,
  );
  res.status(200).json({ order });
});
