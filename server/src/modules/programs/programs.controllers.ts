import { Request, Response } from "express";
import { Program } from "./programs.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureDate, ensureString, isDefined } from "../../utils/validators";
import { notificationService } from "../../services/notification.service";

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  const program = await Program.create({
    title: ensureString(req.body.title, "title"),
    description: req.body.description,
    date: ensureDate(req.body.date, "date"),
    location: req.body.location,
  });

  notificationService
    .sendProgramCreatedNotification({
      title: program.title,
      description: program.description,
      date: program.date,
      location: program.location,
    })
    .catch((error) => {
      console.error("Failed to send program notification email", error);
    });

  res.status(201).json({ success: true, data: program });
});

export const getPrograms = asyncHandler(async (_: Request, res: Response) => {
  const programs = await Program.find().sort({ date: -1 });
  res.json({ success: true, data: programs });
});

export const getProgramById = asyncHandler(async (req: Request, res: Response) => {
  const program = await Program.findById(req.params.id);
  if (!program) {
    throw new HttpError(404, "Program not found");
  }

  res.json({ success: true, data: program });
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (isDefined(req.body.title)) updates.title = ensureString(req.body.title, "title");
  if (isDefined(req.body.description)) updates.description = req.body.description;
  if (isDefined(req.body.date)) updates.date = ensureDate(req.body.date, "date");
  if (isDefined(req.body.location)) updates.location = req.body.location;

  const program = await Program.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!program) {
    throw new HttpError(404, "Program not found");
  }

  res.json({ success: true, data: program });
});

export const deleteProgram = asyncHandler(async (req: Request, res: Response) => {
  const program = await Program.findByIdAndDelete(req.params.id);
  if (!program) {
    throw new HttpError(404, "Program not found");
  }

  res.json({ success: true, message: "Program deleted" });
});
