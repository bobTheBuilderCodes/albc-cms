import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ensureDate, ensureString, isDefined } from "../../utils/validators";
import SoulCenterVisitor from "./soul-center.model";
import Member from "../members/member.model";
import { HttpError } from "../../utils/httpError";

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

export const createSoulCenterVisitor = asyncHandler(async (req: Request, res: Response) => {
  const visitor = await SoulCenterVisitor.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    email: req.body.email,
    visitDate: ensureDate(req.body.visitDate, "visitDate"),
    invitedBy: req.body.invitedBy || undefined,
    description: req.body.description,
    status: "pending",
  });

  const populated = await SoulCenterVisitor.findById(visitor._id).populate("invitedBy");
  res.status(201).json({ success: true, data: populated });
});

export const getSoulCenterVisitors = asyncHandler(async (_: Request, res: Response) => {
  const visitors = await SoulCenterVisitor.find().populate("invitedBy").sort({ visitDate: -1 });
  res.json({ success: true, data: visitors });
});

export const updateSoulCenterVisitor = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (isDefined(req.body.firstName)) updates.firstName = req.body.firstName;
  if (isDefined(req.body.lastName)) updates.lastName = req.body.lastName;
  if (isDefined(req.body.phone)) updates.phone = req.body.phone;
  if (isDefined(req.body.email)) updates.email = req.body.email;
  if (isDefined(req.body.visitDate)) updates.visitDate = ensureDate(req.body.visitDate, "visitDate");
  if (isDefined(req.body.invitedBy)) updates.invitedBy = req.body.invitedBy || undefined;
  if (isDefined(req.body.description)) updates.description = req.body.description;
  if (isDefined(req.body.status)) updates.status = req.body.status;

  const visitor = await SoulCenterVisitor.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate("invitedBy");
  if (!visitor) {
    throw new HttpError(404, "Visitor not found");
  }

  res.json({ success: true, data: visitor });
});

export const deleteSoulCenterVisitor = asyncHandler(async (req: Request, res: Response) => {
  const visitor = await SoulCenterVisitor.findByIdAndDelete(req.params.id);
  if (!visitor) {
    throw new HttpError(404, "Visitor not found");
  }
  res.json({ success: true, message: "Visitor deleted" });
});

export const convertSoulCenterVisitor = asyncHandler(async (req: Request, res: Response) => {
  const visitor = await SoulCenterVisitor.findById(req.params.id);
  if (!visitor) {
    throw new HttpError(404, "Visitor not found");
  }
  if (visitor.status === "converted") {
    throw new HttpError(400, "Visitor already converted");
  }

  const member = await Member.create({
    firstName: isDefined(req.body.firstName) ? ensureString(req.body.firstName, "firstName") : visitor.firstName,
    lastName: isDefined(req.body.lastName) ? ensureString(req.body.lastName, "lastName") : visitor.lastName,
    gender: isDefined(req.body.gender) ? ensureEnum(req.body.gender, memberGenders, "gender") : undefined,
    maritalStatus: isDefined(req.body.maritalStatus)
      ? ensureEnum(req.body.maritalStatus, maritalStatuses, "maritalStatus")
      : undefined,
    membershipStatus: isDefined(req.body.membershipStatus)
      ? ensureEnum(req.body.membershipStatus, membershipStatuses, "membershipStatus")
      : undefined,
    department: req.body.department,
    phone: isDefined(req.body.phone) ? req.body.phone : visitor.phone,
    email: isDefined(req.body.email) ? req.body.email : visitor.email,
    address: req.body.address,
    dateOfBirth: isDefined(req.body.dateOfBirth) ? ensureDate(req.body.dateOfBirth, "dateOfBirth") : undefined,
    joinDate: isDefined(req.body.joinDate) ? ensureDate(req.body.joinDate, "joinDate") : visitor.visitDate,
  });

  visitor.status = "converted";
  visitor.convertedMemberId = member._id;
  await visitor.save();

  res.json({ success: true, data: { visitor, member } });
});
