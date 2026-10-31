import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import validate from "../../middlewares/validate.js";
import { listOrdersQuerySchema, orderIdParamSchema } from "./order.schemas.js";
import { place, list, getOne } from "./order.controller.js";

const router = Router();

router.use(protect);

router.post("/", place);
router.get("/", validate(listOrdersQuerySchema, "query"), list);
router.get("/:id", validate(orderIdParamSchema, "params"), getOne);

export default router;