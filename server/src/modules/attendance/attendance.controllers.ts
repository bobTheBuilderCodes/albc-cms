import { Request, Response } from "express";
import Attendance from "./attendance.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { isDefined } from "../../utils/validators";

const allowedStatuses = ["Present", "Absent"];

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { program, member, status } = req.body;

  if (!program || !member || !status) {
    throw new HttpError(400, "program, member and status are required");
  }

  if (!allowedStatuses.includes(status)) {
    throw new HttpError(400, "status must be Present or Absent");
  }

  const attendance = await Attendance.findOneAndUpdate(
    { program, member },
    { status },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(201).json({ success: true, data: attendance });
});

export const getAttendance = asyncHandler(async (_: Request, res: Response) => {
  const records = await Attendance.find().populate("member").populate("program").sort({ createdAt: -1 });
  res.json({ success: true, data: records });
});

export const getAttendanceByProgram = asyncHandler(async (req: Request, res: Response) => {
  const records = await Attendance.find({ program: req.params.programId })
    .populate("member")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: records });
});

export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};

  if (isDefined(req.body.status)) {
    if (!allowedStatuses.includes(req.body.status)) {
      throw new HttpError(400, "status must be Present or Absent");
    }
    updates.status = req.body.status;
  }

  const attendance = await Attendance.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!attendance) {
    throw new HttpError(404, "Attendance record not found");
  }

  res.json({ success: true, data: attendance });
});

export const deleteAttendance = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await Attendance.findByIdAndDelete(req.params.id);

  if (!attendance) {
    throw new HttpError(404, "Attendance record not found");
  }

  res.json({ success: true, message: "Attendance record deleted" });
});
