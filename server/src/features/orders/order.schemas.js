import { z } from "zod";
import { objectIdSchema } from "../products/product.schemas.js";
import { ORDER_STATUSES } from "./order.model.js";

export const orderIdParamSchema = z.object({
  id: objectIdSchema,
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(ORDER_STATUSES).optional(),
});