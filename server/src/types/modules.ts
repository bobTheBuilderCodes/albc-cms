import { UserRole } from "./roles";

export const MODULE_PERMISSIONS = [
  "dashboard",
  "analytics",
  "members",
  "programs",
  "attendance",
  "messaging",
  "finance",
  "audit",
  "settings",
  "users",
] as const;

export type ModulePermission = (typeof MODULE_PERMISSIONS)[number];

export const defaultModulesForRole = (role: UserRole): ModulePermission[] => {
  switch (role) {
    case "Admin":
      return [...MODULE_PERMISSIONS];
    case "Pastor":
      return ["dashboard", "analytics", "members", "programs", "attendance", "messaging", "audit"];
    case "Finance":
      return ["dashboard", "analytics", "finance", "audit", "members"];
    case "Staff":
    default:
      return ["dashboard", "analytics", "members", "programs", "attendance", "messaging"];
  }
};
