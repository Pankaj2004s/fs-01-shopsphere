import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name cannot be more than 50 characters"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot be more than 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
