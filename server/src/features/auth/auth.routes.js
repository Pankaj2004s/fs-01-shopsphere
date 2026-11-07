import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.js";
import { createLimiter } from "../../middlewares/rateLimit.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { register, login, me } from "./auth.controller.js";

const router = Router();

const registerLimiter = createLimiter({
  name: "register",
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many accounts created, please try again later",
});

const loginLimiter = createLimiter({
  name: "login",
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many login attempts, please try again later",
});

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.get("/me", protect, me);

export default router;
