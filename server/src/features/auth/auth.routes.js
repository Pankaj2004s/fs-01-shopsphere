import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import { register, login } from "./auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", protect, me);

export default router;
