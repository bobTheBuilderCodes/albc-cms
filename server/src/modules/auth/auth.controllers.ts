import { Request, Response } from "express";
import User from "../users/user.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { comparePassword, hashPassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { MODULE_PERMISSIONS, defaultModulesForRole } from "../../types/modules";
import { USER_ROLES, UserRole } from "../../types/roles";
import { ensureString } from "../../utils/validators";

const normalizeModules = (modules: unknown, role: string): string[] => {
  if (modules === undefined) {
    const typedRole = USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "Staff";
    return defaultModulesForRole(typedRole);
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

export const register = asyncHandler(async (req: Request, res: Response) => {
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
    modules: normalizeModules(req.body.modules, role),
    isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
  });

  const token = signToken({ id: String(user._id), role: user.role });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        modules: user.modules,
        isActive: user.isActive,
      },
      token,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const email = ensureString(req.body.email, "email").toLowerCase();
  const password = ensureString(req.body.password, "password");

  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }
  if (!user.isActive) {
    throw new HttpError(403, "Your account is deactivated");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken({ id: String(user._id), role: user.role });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        modules: user.modules,
        isActive: user.isActive,
      },
      token,
    },
  });
});
