import express, { Router } from "express";
import { webhook } from "./payment.controller.js";

const router = Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json", limit: "100kb" }),
  webhook,
);

export default router;
