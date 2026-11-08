import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./order.schemas.js";
import {
  place,
  list,
  getOne,
  listVendor,
  vendorStats,
  updateStatus,
} from "./order.controller.js";
import { confirmPaymentSchema } from "../payments/payment.schemas.js";
import { create, confirm } from "../payments/payment.controller.js";

const router = Router();

router.use(protect);

router.post("/", place);
router.get("/", validate(listOrdersQuerySchema, "query"), list);
router.get(
  "/vendor",
  authorize("vendor"),
  validate(listOrdersQuerySchema, "query"),
  listVendor,
);
router.get("/vendor/stats", authorize("vendor"), vendorStats);
router.get("/:id", validate(orderIdParamSchema, "params"), getOne);
router.patch(
  "/:id/status",
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  updateStatus,
);
router.post("/:id/pay", validate(orderIdParamSchema, "params"), create);
router.post(
  "/:id/pay/confirm",
  validate(orderIdParamSchema, "params"),
  validate(confirmPaymentSchema),
  confirm,
);

export default router;
