import { Router } from "express";
import {
  createMember,
  deleteMember,
  getMemberById,
  getMembers,
  updateMember,
} from "./member.controllers";
import { protect } from "../../middlewares/auth.middleware";

const router = Router();

router.use(protect);

router.post("/", createMember);
router.get("/", getMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.delete("/:id", deleteMember);

export default router;
