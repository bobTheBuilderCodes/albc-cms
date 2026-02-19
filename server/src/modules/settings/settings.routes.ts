import { Router } from "express";
import {
  createSettings,
  getSettings,
  sendTestEmail,
  updateSettings,
} from "./settings.controllers";
import { protect } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

router.use(protect);

router.post("/", authorize("Admin"), createSettings);
router.get("/", getSettings);
router.put("/:id", authorize("Admin"), updateSettings);
router.post("/test-email", authorize("Admin"), sendTestEmail);

export default router;
