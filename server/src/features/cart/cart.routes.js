import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} from "./cart.schemas.js";
import { view, add, update, remove } from "./cart.controller.js";

const router = Router();

router.use(protect);

router.get("/", view);
router.post("/items", validate(addToCartSchema), add);
router.patch(
  "/items/:productId",
  validate(cartItemParamSchema, "params"),
  validate(updateCartItemSchema),
  update,
);
router.delete(
  "/items/:productId",
  validate(cartItemParamSchema, "params"),
  remove,
);

export default router;