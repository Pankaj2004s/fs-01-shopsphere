import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
} from "./product.schemas.js";
import { create, getOne, list } from "./product.controller.js";

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

export default router;
