import { Request, Response } from "express";
import Settings from "../settings/settings.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureString } from "../../utils/validators";
import { sendArkeselSMS } from "../../services/arkesel.service";
import { env } from "../../config/env";
import { createSmsLog, listSmsLogs, mapSmsLog } from "../../services/sms-log.service";

type RecipientInput = {
  memberId?: string;
  name?: string;
  phone: string;
};

const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (!trimmed) return "";

  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const withoutPlus = digitsOnly.startsWith("+") ? digitsOnly.slice(1) : digitsOnly;
  if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
  if (withoutPlus.startsWith("233")) return withoutPlus;
  return withoutPlus;
};

export const sendSms = asyncHandler(async (req: Request, res: Response) => {
  const message = ensureString(req.body.message, "message");
  const sender = req.body.sender ? ensureString(req.body.sender, "sender") : "ChurchCMS";
  const recipients = (req.body.recipients || []) as RecipientInput[];

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new HttpError(400, "recipients must be a non-empty array");
  }

  const settings = await Settings.findOne();
  if (!settings?.smsEnabled) {
    throw new HttpError(400, "SMS is disabled in Settings");
  }

  const provider = String(settings.smsProvider || "").toLowerCase();
  if (provider !== "arkesel") {
    throw new HttpError(400, "SMS provider is not configured to Arkesel");
  }

  const apiKey = String(settings.smsApiKey || env.ARKESEL_API_KEY || "").trim();
  if (!apiKey) {
    throw new HttpError(400, "Arkesel API key is missing in Settings and env");
  }

  const senderId = String(settings.smsSenderId || env.ARKESEL_SENDER_ID || sender).trim();

  const normalizedRecipients = recipients
    .map((r) => ({
      ...r,
      phone: normalizePhone(String(r.phone || "")),
    }))
    .filter((r) => Boolean(r.phone));

  if (normalizedRecipients.length === 0) {
    throw new HttpError(400, "No valid recipient phone numbers found");
  }

  try {
    const sendResult = await sendArkeselSMS({
      apiKey,
      sender: senderId,
      message,
      recipients: normalizedRecipients.map((r) => r.phone),
    });

    const savedLogs = await Promise.all(
      normalizedRecipients.map((recipient) =>
        createSmsLog({
          recipientId: recipient.memberId || recipient.phone,
          recipientName: recipient.name || recipient.phone,
          recipientPhone: recipient.phone,
          message,
          type: "manual",
          status: "sent",
          sentAt: new Date(),
          createdBy: req.user?.id || "system",
        })
      )
    );

    res.status(201).json({
      success: true,
      data: {
        provider: "arkesel",
        sender: senderId,
        message,
        recipients: normalizedRecipients.length,
        logs: savedLogs.map(mapSmsLog),
        upstream: sendResult,
      },
    });
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "SMS delivery failed";
    await Promise.all(
      normalizedRecipients.map((recipient) =>
        createSmsLog({
          recipientId: recipient.memberId || recipient.phone,
          recipientName: recipient.name || recipient.phone,
          recipientPhone: recipient.phone,
          message,
          type: "manual",
          status: "failed",
          failureReason,
          createdBy: req.user?.id || "system",
        })
      )
    );
    throw new HttpError(502, `Arkesel delivery failed: ${failureReason}`);
  }
});

export const getSmsLogs = asyncHandler(async (_req: Request, res: Response) => {
  const logs = await listSmsLogs();
  res.json({
    success: true,
    data: logs.map(mapSmsLog),
  });
});
