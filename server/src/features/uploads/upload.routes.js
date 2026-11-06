import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";
import { uploadImage as parseImage } from "../../middlewares/upload.js";
import { uploadImage } from "./upload.controller.js";

const router = Router();

router.post(
  "/images",
  protect,
  authorize("vendor", "admin"),
  parseImage,
  uploadImage,
);

export default router;
