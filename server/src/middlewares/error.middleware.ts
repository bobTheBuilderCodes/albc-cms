import { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError";

export const notFound = (req: Request, _: Response, next: NextFunction): void => {
  next(new HttpError(404, `Route not found: ${req.originalUrl}`));
};

export const errorHandler = (
  error: Error,
  _: Request,
  res: Response,
  __: NextFunction
): void => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = error.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};
