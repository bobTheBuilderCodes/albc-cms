import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";
import { verifyToken } from "../utils/jwt";

export const protect = (req: Request, _: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new HttpError(401, "Not authorized"));
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid token"));
  }
};
