import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import {
  convertSoulCenterVisitor,
  createSoulCenterVisitor,
  deleteSoulCenterVisitor,
  getSoulCenterVisitors,
  updateSoulCenterVisitor,
} from "./soul-center.controllers";

const router = Router();

router.use(protect);

router.get("/", getSoulCenterVisitors);
router.post("/", authorize("Admin", "Pastor", "Staff"), createSoulCenterVisitor);
router.put("/:id", authorize("Admin", "Pastor", "Staff"), updateSoulCenterVisitor);
router.delete("/:id", authorize("Admin", "Pastor"), deleteSoulCenterVisitor);
router.post("/:id/convert", authorize("Admin", "Pastor", "Staff"), convertSoulCenterVisitor);

export default router;
