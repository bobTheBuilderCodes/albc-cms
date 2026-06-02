import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createAutomation,
  deleteAutomation,
  getAutomations,
  updateAutomation,
} from "./automation.controllers";

const router = Router();

router.use(protect);

router.get("/", getAutomations);
router.post("/", createAutomation);
router.put("/:id", updateAutomation);
router.delete("/:id", deleteAutomation);

export default router;
