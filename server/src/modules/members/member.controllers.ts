import { Request, Response } from "express";
import Member from "./member.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureDate, ensureString, isDefined } from "../../utils/validators";
import { notificationService } from "../../services/notification.service";

export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.create({
    firstName: ensureString(req.body.firstName, "firstName"),
    lastName: ensureString(req.body.lastName, "lastName"),
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
    dateOfBirth: isDefined(req.body.dateOfBirth)
      ? ensureDate(req.body.dateOfBirth, "dateOfBirth")
      : undefined,
    joinDate: isDefined(req.body.joinDate)
      ? ensureDate(req.body.joinDate, "joinDate")
      : undefined,
  });

  notificationService.sendMemberWelcome(member).catch((error) => {
    console.error("Failed to send member welcome email", error);
  });

  res.status(201).json({ success: true, data: member });
});

export const getMembers = asyncHandler(async (_: Request, res: Response) => {
  const members = await Member.find().sort({ createdAt: -1 });
  res.json({ success: true, data: members });
});

export const getMemberById = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    throw new HttpError(404, "Member not found");
  }

  res.json({ success: true, data: member });
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};

  if (isDefined(req.body.firstName)) updates.firstName = ensureString(req.body.firstName, "firstName");
  if (isDefined(req.body.lastName)) updates.lastName = ensureString(req.body.lastName, "lastName");
  if (isDefined(req.body.phone)) updates.phone = req.body.phone;
  if (isDefined(req.body.email)) updates.email = req.body.email;
  if (isDefined(req.body.address)) updates.address = req.body.address;
  if (isDefined(req.body.dateOfBirth)) {
    updates.dateOfBirth = ensureDate(req.body.dateOfBirth, "dateOfBirth");
  }
  if (isDefined(req.body.joinDate)) {
    updates.joinDate = ensureDate(req.body.joinDate, "joinDate");
  }

  const member = await Member.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!member) {
    throw new HttpError(404, "Member not found");
  }

  res.json({ success: true, data: member });
});

export const deleteMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findByIdAndDelete(req.params.id);
  if (!member) {
    throw new HttpError(404, "Member not found");
  }
  res.json({ success: true, message: "Member deleted" });
});
