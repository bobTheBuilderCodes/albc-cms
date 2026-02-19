import { Request, Response } from "express";
import User from "./user.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { hashPassword } from "../../utils/password";
import { MODULE_PERMISSIONS, defaultModulesForRole } from "../../types/modules";
import { USER_ROLES, UserRole } from "../../types/roles";
import { ensureString } from "../../utils/validators";
import { notificationService } from "../../services/notification.service";

const parseModules = (modules: unknown, fallbackRole: string): string[] => {
  if (modules === undefined) {
    const role = USER_ROLES.includes(fallbackRole as UserRole) ? (fallbackRole as UserRole) : "Staff";
    return defaultModulesForRole(role);
  }

  if (!Array.isArray(modules) || modules.length === 0) {
    throw new HttpError(400, "modules must be a non-empty array");
  }

  const cleaned = modules.map((module) => String(module).trim());
  const invalid = cleaned.find((module) => !MODULE_PERMISSIONS.includes(module as any));
  if (invalid) {
    throw new HttpError(400, `Invalid module permission: ${invalid}`);
  }

  return Array.from(new Set(cleaned));
};

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const name = ensureString(req.body.name, "name");
  const email = ensureString(req.body.email, "email").toLowerCase();
  const password = ensureString(req.body.password, "password");
  const role = req.body.role || "Staff";

  if (!USER_ROLES.includes(role)) {
    throw new HttpError(400, "Invalid role");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new HttpError(409, "User with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password: await hashPassword(password),
    role,
    modules: parseModules(req.body.modules, role),
    isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
  });

  notificationService.sendUserCreatedCredentialsEmail(user, password).catch((error) => {
    console.error("Failed to send user credentials email", error);
  });

  res.status(201).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      modules: user.modules,
      isActive: user.isActive,
    },
  });
});

export const getUsers = asyncHandler(async (_: Request, res: Response) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  res.json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};

  if (req.body.name !== undefined) updates.name = ensureString(req.body.name, "name");
  if (req.body.email !== undefined) updates.email = ensureString(req.body.email, "email").toLowerCase();

  if (req.body.role !== undefined) {
    if (!USER_ROLES.includes(req.body.role)) {
      throw new HttpError(400, "Invalid role");
    }
    updates.role = req.body.role;
  }

  const effectiveRole = String(updates.role || req.body.role || "Staff");
  if (req.body.modules !== undefined) {
    updates.modules = parseModules(req.body.modules, effectiveRole);
  }

  if (req.body.isActive !== undefined) {
    updates.isActive = Boolean(req.body.isActive);
  }

  if (req.body.password !== undefined) {
    updates.password = await hashPassword(ensureString(req.body.password, "password"));
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  res.json({ success: true, message: "User deleted" });
});
