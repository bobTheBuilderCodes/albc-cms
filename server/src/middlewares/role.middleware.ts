import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export const authorize = (...roles: string[]) => {
  return (req: Request, _: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, "Not authorized"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, "Forbidden"));
      return;
    }

    next();
  };
};
