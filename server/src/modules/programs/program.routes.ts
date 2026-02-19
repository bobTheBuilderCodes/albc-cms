import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createProgram,
  deleteProgram,
  getProgramById,
  getPrograms,
  updateProgram,
} from "./programs.controllers";

const router = Router();

router.use(protect);

router.post("/", createProgram);
router.get("/", getPrograms);
router.get("/:id", getProgramById);
router.put("/:id", updateProgram);
router.delete("/:id", deleteProgram);

export default router;
