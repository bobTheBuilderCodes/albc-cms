import { Request, Response } from "express";
import Attendance from "./attendance.model";
import Member from "../members/member.model";
import SundayAttendance from "./sunday-attendance.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { isDefined } from "../../utils/validators";

const allowedStatuses = ["Present", "Absent"];
const currentYear = new Date().getFullYear();

const toSundayKey = (date: Date): string => date.toISOString().slice(0, 10);
const toStartOfUtcDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const parseSundayKey = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "Invalid sundayKey format. Use YYYY-MM-DD");
  }
  if (parsed.getUTCDay() !== 0) {
    throw new HttpError(400, "sundayKey must be a Sunday");
  }
  return parsed;
};

const getSundaysForYear = (year: number): Date[] => {
  const sundays: Date[] = [];
  const date = new Date(Date.UTC(year, 0, 1));

  while (date.getUTCDay() !== 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  while (date.getUTCFullYear() === year) {
    sundays.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 7);
  }

  return sundays;
};

const getPreviousSundayKeyUtc = (now: Date): string => {
  const currentDay = toStartOfUtcDay(now);
  const dayOfWeek = currentDay.getUTCDay(); // 0 = Sunday
  const daysBack = dayOfWeek === 0 ? 7 : dayOfWeek;
  currentDay.setUTCDate(currentDay.getUTCDate() - daysBack);
  return toSundayKey(currentDay);
};

const getWednesdayDeadlineUtc = (sundayKey: string): Date => {
  const sundayDate = parseSundayKey(sundayKey);
  const deadline = new Date(sundayDate);
  deadline.setUTCDate(deadline.getUTCDate() + 3); // Wednesday
  deadline.setUTCHours(18, 0, 0, 0); // 6:00 PM UTC
  return deadline;
};

const getSundayEditWindow = (now: Date) => {
  const previousSundayKey = getPreviousSundayKeyUtc(now);
  const submissionDeadlineUtc = getWednesdayDeadlineUtc(previousSundayKey);
  const canEditPreviousSunday = now.getTime() < submissionDeadlineUtc.getTime();
  return {
    previousSundayKey,
    submissionDeadlineUtc,
    canEditPreviousSunday,
  };
};

const canEditSundayAttendance = (sundayKey: string, now: Date): boolean => {
  const todayKey = toSundayKey(toStartOfUtcDay(now));
  if (sundayKey > todayKey) return false;

  const { previousSundayKey, canEditPreviousSunday } = getSundayEditWindow(now);
  return canEditPreviousSunday && sundayKey === previousSundayKey;
};

const ensureCurrentYearSundayAttendance = async (year: number): Promise<void> => {
  if (year !== currentYear) return;

  const [members, existing] = await Promise.all([
    Member.find().select("_id"),
    SundayAttendance.find({ year }).select("sundayKey member"),
  ]);

  if (members.length === 0) return;

  const sundays = getSundaysForYear(year);
  const existingKeys = new Set(existing.map((record) => `${record.sundayKey}:${String(record.member)}`));

  const missingDocs: Array<{
    year: number;
    sundayKey: string;
    sundayDate: Date;
    member: string;
    status: "Present";
  }> = [];

  for (const sundayDate of sundays) {
    const sundayKey = toSundayKey(sundayDate);
    for (const member of members) {
      const memberId = String(member._id);
      const compositeKey = `${sundayKey}:${memberId}`;
      if (existingKeys.has(compositeKey)) continue;

      missingDocs.push({
        year,
        sundayKey,
        sundayDate,
        member: memberId,
        status: "Present",
      });
    }
  }

  if (missingDocs.length > 0) {
    try {
      await SundayAttendance.insertMany(missingDocs, { ordered: false });
    } catch (error: any) {
      // Ignore duplicate-key collisions from concurrent requests.
      const duplicateOnly =
        error?.code === 11000 ||
        (Array.isArray(error?.writeErrors) &&
          error.writeErrors.length > 0 &&
          error.writeErrors.every((entry: { code?: number }) => entry.code === 11000));
      if (!duplicateOnly) {
        throw error;
      }
    }
  }
};

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

export const getSundayAttendanceYears = asyncHandler(async (_: Request, res: Response) => {
  const years = await SundayAttendance.distinct("year");
  const normalized = Array.from(new Set([...years, currentYear])).sort((a, b) => b - a);
  res.json({ success: true, data: normalized });
});

export const getSundayAttendanceByYear = asyncHandler(async (req: Request, res: Response) => {
  const year = Number(req.params.year);
  if (Number.isNaN(year) || year < 1900 || year > 3000) {
    throw new HttpError(400, "Invalid year");
  }

  await ensureCurrentYearSundayAttendance(year);

  const now = new Date();
  const editWindow = getSundayEditWindow(now);

  const [records, sundayDates] = await Promise.all([
    SundayAttendance.find({ year }).populate("member").sort({ sundayDate: 1 }),
    Promise.resolve(getSundaysForYear(year).map(toSundayKey)),
  ]);

  res.json({
    success: true,
    data: {
      year,
      sundayDates,
      records,
      editWindow: {
        previousSundayKey: editWindow.previousSundayKey,
        submissionDeadlineUtc: editWindow.submissionDeadlineUtc.toISOString(),
        canEditPreviousSunday: editWindow.canEditPreviousSunday,
        serverNowUtc: now.toISOString(),
      },
    },
  });
});

export const markSundayAttendance = asyncHandler(async (req: Request, res: Response) => {
  const year = Number(req.params.year);
  const { memberId, sundayKey, status } = req.body;

  if (Number.isNaN(year) || year < 1900 || year > 3000) {
    throw new HttpError(400, "Invalid year");
  }
  if (!memberId || !sundayKey || !status) {
    throw new HttpError(400, "memberId, sundayKey and status are required");
  }
  if (!allowedStatuses.includes(status)) {
    throw new HttpError(400, "status must be Present or Absent");
  }

  const sundayDate = parseSundayKey(String(sundayKey));
  if (sundayDate.getUTCFullYear() !== year) {
    throw new HttpError(400, "sundayKey does not belong to the selected year");
  }
  if (!canEditSundayAttendance(String(sundayKey), new Date())) {
    throw new HttpError(
      403,
      "Sunday attendance is editable only for the previous Sunday and only until Wednesday 6:00 PM."
    );
  }

  const memberExists = await Member.exists({ _id: memberId });
  if (!memberExists) {
    throw new HttpError(404, "Member not found");
  }

  const updated = await SundayAttendance.findOneAndUpdate(
    { year, sundayKey, member: memberId },
    { year, sundayKey, sundayDate, member: memberId, status },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).populate("member");

  res.json({ success: true, data: updated });
});
