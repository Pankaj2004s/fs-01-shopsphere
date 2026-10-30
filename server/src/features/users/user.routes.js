import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.js";

const router = Router();

router.get("/admin-check", protect, authorize("admin"), (req, res) => {
  res.status(200).json({ message: `Hello admin ${req.user.name}` });
});

export default router;
