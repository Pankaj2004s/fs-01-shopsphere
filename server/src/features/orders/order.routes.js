import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { place } from "./order.controller.js";

const router = Router();

router.use(protect);

router.post("/", place);

export default router;