import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { becomeVendor } from "./user.controller.js";

const router = Router();

router.post("/become-vendor", protect, becomeVendor);

export default router;
