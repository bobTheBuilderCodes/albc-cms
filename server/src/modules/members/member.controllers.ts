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

const normalizeEmail = (value: unknown): string => {
  return String(value || "").trim().toLowerCase();
};

const normalizePhone = (value: unknown): string => {
  const cleaned = String(value || "").trim().replace(/\s+/g, "");
  if (!cleaned) return "";
  const digits = cleaned.replace(/[^\d+]/g, "");
  const withoutPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
  if (withoutPlus.startsWith("233")) return withoutPlus;
  return withoutPlus;
};

const normalizeDepartments = (value: unknown, fallbackDepartment?: string): string[] => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,|/\n]/)
      : [];
  const normalized = Array.from(
    new Set(
      raw
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  if (normalized.length > 0) return normalized;
  if (fallbackDepartment && String(fallbackDepartment).trim()) return [String(fallbackDepartment).trim()];
  return [];
};

const findDuplicateMember = async (input: {
  email?: unknown;
  phone?: unknown;
  excludeId?: string;
}): Promise<{ field: "email" | "phone"; memberName: string } | null> => {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedEmail && !normalizedPhone) return null;

  const candidates = await Member.find(
    input.excludeId ? { _id: { $ne: input.excludeId } } : {}
  ).select("firstName lastName email phone");

  for (const member of candidates) {
    const memberName = `${String(member.firstName || "").trim()} ${String(member.lastName || "").trim()}`.trim();
    if (normalizedEmail && normalizeEmail(member.email) === normalizedEmail) {
      return { field: "email", memberName: memberName || "another member" };
    }
    if (normalizedPhone && normalizePhone(member.phone) === normalizedPhone) {
      return { field: "phone", memberName: memberName || "another member" };
    }
  }

  return null;
};

export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const duplicate = await findDuplicateMember({
    email: req.body.email,
    phone: req.body.phone,
  });
  if (duplicate) {
    throw new HttpError(
      409,
      `A member with the same ${duplicate.field} already exists (${duplicate.memberName}).`
    );
  }

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
    department: isDefined(req.body.department) ? ensureString(req.body.department, "department") : undefined,
    departments: normalizeDepartments(req.body.departments, String(req.body.department || "")),
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
  if (isDefined(req.body.department)) updates.department = ensureString(req.body.department, "department");
  if (isDefined(req.body.departments)) {
    updates.departments = normalizeDepartments(req.body.departments, String(req.body.department || ""));
  }
  if (isDefined(req.body.phone)) updates.phone = req.body.phone;
  if (isDefined(req.body.email)) updates.email = req.body.email;
  if (isDefined(req.body.address)) updates.address = req.body.address;
  if (isDefined(req.body.dateOfBirth)) {
    updates.dateOfBirth = ensureDate(req.body.dateOfBirth, "dateOfBirth");
  }
  if (isDefined(req.body.joinDate)) {
    updates.joinDate = ensureDate(req.body.joinDate, "joinDate");
  }

  const existingMember = await Member.findById(req.params.id).select("_id");
  if (!existingMember) {
    throw new HttpError(404, "Member not found");
  }

  const duplicate = await findDuplicateMember({
    email: isDefined(req.body.email) ? req.body.email : undefined,
    phone: isDefined(req.body.phone) ? req.body.phone : undefined,
    excludeId: String(req.params.id || ""),
  });
  if (duplicate) {
    throw new HttpError(
      409,
      `A member with the same ${duplicate.field} already exists (${duplicate.memberName}).`
    );
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
