import { Request, Response } from "express";
import Settings from "../settings/settings.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureString } from "../../utils/validators";
import { sendArkeselSMS } from "../../services/arkesel.service";

type RecipientInput = {
  memberId?: string;
  name?: string;
  phone: string;
};

const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+233${trimmed.slice(1)}`;
  if (trimmed.startsWith("233")) return `+${trimmed}`;
  return trimmed;
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

  const apiKey = String(settings.smsApiKey || "").trim();
  if (!apiKey) {
    throw new HttpError(400, "Arkesel API key is missing in Settings");
  }

  const senderId = String(settings.smsSenderId || sender);

  const normalizedRecipients = recipients
    .map((r) => ({
      ...r,
      phone: normalizePhone(String(r.phone || "")),
    }))
    .filter((r) => Boolean(r.phone));

  if (normalizedRecipients.length === 0) {
    throw new HttpError(400, "No valid recipient phone numbers found");
  }

  const sendResult = await sendArkeselSMS({
    apiKey,
    sender: senderId,
    message,
    recipients: normalizedRecipients.map((r) => r.phone),
  });

  const logs = normalizedRecipients.map((recipient) => ({
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    recipientId: recipient.memberId || recipient.phone,
    recipientName: recipient.name || recipient.phone,
    recipientPhone: recipient.phone,
    message,
    type: "manual",
    status: "sent",
    sentAt: new Date().toISOString(),
    createdBy: req.user?.id || "system",
    createdAt: new Date().toISOString(),
  }));

  res.status(201).json({
    success: true,
    data: {
      provider: "arkesel",
      sender: senderId,
      message,
      recipients: normalizedRecipients.length,
      logs,
      upstream: sendResult,
    },
  });
});
