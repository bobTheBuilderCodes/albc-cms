import { Request, Response } from "express";
import Member from "./member.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureDate, ensureString, isDefined } from "../../utils/validators";
import { notificationService } from "../../services/notification.service";

const memberGenders = ["male", "female"] as const;
const maritalStatuses = ["single", "married", "widowed", "divorced"] as const;
const membershipStatuses = ["active", "inactive"] as const;

const ensureEnum = <T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string
): T[number] => {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T[number];
};

export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.create({
    firstName: ensureString(req.body.firstName, "firstName"),
    lastName: ensureString(req.body.lastName, "lastName"),
    gender: isDefined(req.body.gender)
      ? ensureEnum(req.body.gender, memberGenders, "gender")
      : undefined,
    maritalStatus: isDefined(req.body.maritalStatus)
      ? ensureEnum(req.body.maritalStatus, maritalStatuses, "maritalStatus")
      : undefined,
    membershipStatus: isDefined(req.body.membershipStatus)
      ? ensureEnum(req.body.membershipStatus, membershipStatuses, "membershipStatus")
      : undefined,
    department: req.body.department,
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
  if (isDefined(req.body.gender)) {
    updates.gender = ensureEnum(req.body.gender, memberGenders, "gender");
  }
  if (isDefined(req.body.maritalStatus)) {
    updates.maritalStatus = ensureEnum(req.body.maritalStatus, maritalStatuses, "maritalStatus");
  }
  if (isDefined(req.body.membershipStatus)) {
    updates.membershipStatus = ensureEnum(
      req.body.membershipStatus,
      membershipStatuses,
      "membershipStatus"
    );
  }
  if (isDefined(req.body.department)) updates.department = req.body.department;
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
