import { z } from "zod";
import { objectIdSchema } from "../products/product.schemas.js";

const quantitySchema = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(99, "Quantity cannot exceed 99");

export const addToCartSchema = z.object({
  productId: objectIdSchema,
  quantity: quantitySchema.default(1),
});

export const updateCartItemSchema = z.object({
  quantity: quantitySchema,
});

export const cartItemParamSchema = z.object({
  productId: objectIdSchema,
});