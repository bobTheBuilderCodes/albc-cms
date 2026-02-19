import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  deleteAttendance,
  getAttendance,
  getAttendanceByProgram,
  markAttendance,
  updateAttendance,
} from "./attendance.controllers";

const router = Router();

router.use(protect);

router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/program/:programId", getAttendanceByProgram);
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
