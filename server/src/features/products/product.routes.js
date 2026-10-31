import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
} from "./product.schemas.js";
import { create, getOne, list, update, remove } from "./product.controller.js";

const router = Router();

router.get("/", validate(listProductsQuerySchema, "query"), list);
router.get("/:id", validate(productIdParamSchema, "params"), getOne);
router.post(
  "/",
  protect,
  authorize("vendor", "admin"),
  validate(createProductSchema),
  create,
);
router.patch(
  "/:id",
  protect,
  authorize("vendor", "admin"),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  update,
);
router.delete(
  "/:id",
  protect,
  authorize("vendor", "admin"),
  validate(productIdParamSchema, "params"),
  remove,
);

export default router;
