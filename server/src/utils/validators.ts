import { HttpError } from "./httpError";

export const ensureString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
};

export const ensureNumber = (value: unknown, field: string): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new HttpError(400, `${field} must be a valid number`);
  }
  return numeric;
};

export const ensureDate = (value: unknown, field: string): Date => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} must be a valid date`);
  }
  return date;
};

export const isDefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};
