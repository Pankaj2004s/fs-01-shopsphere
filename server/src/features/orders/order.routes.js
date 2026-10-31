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
  updateStatus,
} from "./order.controller.js";

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
router.get("/:id", validate(orderIdParamSchema, "params"), getOne);
router.patch(
  "/:id/status",
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  updateStatus,
);

export default router;