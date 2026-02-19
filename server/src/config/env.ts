import dotenv from "dotenv";

dotenv.config();

const requiredKeys = ["MONGO_URI", "JWT_SECRET"] as const;

type RequiredKey = (typeof requiredKeys)[number];

type Env = {
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  EMAIL_FROM: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SECURE: boolean;
  BIRTHDAY_EMAIL_HOUR: number;
};

const readRequired = (key: RequiredKey): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env: Env = {
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: readRequired("MONGO_URI"),
  JWT_SECRET: readRequired("JWT_SECRET"),
  NODE_ENV: process.env.NODE_ENV || "development",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@church.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@churchcms.local",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  BIRTHDAY_EMAIL_HOUR: Number(process.env.BIRTHDAY_EMAIL_HOUR || 8),
};
