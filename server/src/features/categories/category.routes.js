import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import { createCategorySchema } from "./category.schemas.js";
import { create, list } from "./category.controller.js";

const router = Router();

router.get("/", list);
router.post(
  "/",
  protect,
  authorize("admin"),
  validate(createCategorySchema),
  create,
);

export default router;
