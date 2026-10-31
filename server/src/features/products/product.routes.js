import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import { createProductSchema } from "./product.schemas.js";
import { create } from "./product.controller.js";

const router = Router();

router.post(
  "/",
  protect,
  authorize("vendor", "admin"),
  validate(createProductSchema),
  create,
);

export default router;
