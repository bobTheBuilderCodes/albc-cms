import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AuthTokenPayload = {
  id: string;
  role: string;
};

export const signToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};
