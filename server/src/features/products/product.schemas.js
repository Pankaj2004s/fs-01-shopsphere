import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const productIdParamSchema = z.object({
  id: objectIdSchema,
});

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Product name cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  price: z.number().min(0, "Price cannot be negative"),
  stock: z
    .number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .optional(),
  images: z
    .array(z.string().trim().url("Image must be a valid URL"))
    .max(5, "Maximum 5 images allowed")
    .optional(),
  category: objectIdSchema,
});
