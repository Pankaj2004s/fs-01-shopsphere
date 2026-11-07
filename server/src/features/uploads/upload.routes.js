import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import { createLimiter } from "../../middlewares/rateLimit.js";
import { uploadImage as parseImage } from "../../middlewares/upload.js";
import { uploadImage } from "./upload.controller.js";

const router = Router();

const uploadLimiter = createLimiter({
  name: "upload",
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many uploads, please try again later",
});

router.post(
  "/images",
  protect,
  authorize("vendor", "admin"),
  uploadLimiter,
  parseImage,
  uploadImage,
);

export default router;
