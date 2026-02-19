export const USER_ROLES = ["Admin", "Pastor", "Finance", "Staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];
