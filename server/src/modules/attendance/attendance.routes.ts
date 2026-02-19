import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  deleteAttendance,
  getAttendance,
  getAttendanceByProgram,
  getSundayAttendanceByYear,
  getSundayAttendanceYears,
  markAttendance,
  markSundayAttendance,
  updateAttendance,
} from "./attendance.controllers";

const router = Router();

router.use(protect);

router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/program/:programId", getAttendanceByProgram);
router.get("/sunday/years", getSundayAttendanceYears);
router.get("/sunday/:year", getSundayAttendanceByYear);
router.put("/sunday/:year", markSundayAttendance);
router.put("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
