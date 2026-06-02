import { UserRole } from "./roles";

export const MODULE_PERMISSIONS = [
  "dashboard",
  "analytics",
  "members",
  "programs",
  "attendance",
  "messaging",
  "finance",
  "soulcenter",
  "audit",
  "automation",
  "settings",
  "users",
] as const;

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

export const defaultModulesForRole = (role: UserRole): ModulePermission[] => {
  switch (role) {
    case "Admin":
      return ["members", "messaging", "automation", "settings"];
    case "Pastor":
      return ["members", "messaging"];
    case "Finance":
      return ["members", "messaging"];
    case "Staff":
    default:
      return ["members", "messaging"];
  }
};
