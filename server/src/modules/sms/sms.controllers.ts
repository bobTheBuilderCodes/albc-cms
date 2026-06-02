import { Request, Response } from "express";
import Settings from "../settings/settings.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureString } from "../../utils/validators";
import { getArkeselBalance, resolveArkeselApiKey, sendArkeselSMS } from "../../services/arkesel.service";
import { env } from "../../config/env";
import { createSmsLog, listSmsLogs, mapSmsLog } from "../../services/sms-log.service";

type RecipientInput = {
  memberId?: string;
  name?: string;
  phone: string;
};

type SmsLogTypeInput = "manual" | "automation";

const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (!trimmed) return "";

  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const withoutPlus = digitsOnly.startsWith("+") ? digitsOnly.slice(1) : digitsOnly;
  if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
  if (withoutPlus.startsWith("233")) return withoutPlus;
  return withoutPlus;
};

// export const sendSms = asyncHandler(async (req: Request, res: Response) => {
//   const message = ensureString(req.body.message, "message");
//   const sender = req.body.sender ? ensureString(req.body.sender, "sender") : "ChurchCMS";
//   const recipients = (req.body.recipients || []) as RecipientInput[];

//   if (!Array.isArray(recipients) || recipients.length === 0) {
//     throw new HttpError(400, "recipients must be a non-empty array");
//   }

//   const settings = await Settings.findOne();
//   if (!settings?.smsEnabled) {
//     throw new HttpError(400, "SMS is disabled in Settings");
//   }

//   const provider = String(settings.smsProvider || "").toLowerCase();
//   if (provider !== "arkesel") {
//     throw new HttpError(400, "SMS provider is not configured to Arkesel");
//   }

//   const senderId = String(settings.smsSenderId || env.ARKESEL_SENDER_ID || sender).trim();
//   const resolvedKey = await resolveArkeselApiKey({
//     configuredApiKey: String(settings.smsApiKey || "").trim(),
//     fallbackApiKey: env.ARKESEL_API_KEY,
//   });
//   const balance = resolvedKey.balance || (await getArkeselBalance({ apiKey: resolvedKey.apiKey }));
//   const smsBalanceNumber =
//     typeof balance.smsBalance === "number"
//       ? balance.smsBalance
//       : Number(String(balance.smsBalance || "").replace(/[^\d.-]/g, ""));
//   if (!Number.isFinite(smsBalanceNumber) || smsBalanceNumber <= 0) {
//     throw new HttpError(
//       402,
//       `Insufficient SMS balance on the selected Arkesel API key. SMS balance: ${balance.smsBalance ?? "0"}. Please top up this key and try again.`
//     );
//   }

//   const normalizedRecipients = recipients
//     .map((r) => ({
//       ...r,
//       phone: normalizePhone(String(r.phone || "")),
//     }))
//     .filter((r) => Boolean(r.phone));

//   if (normalizedRecipients.length === 0) {
//     throw new HttpError(400, "No valid recipient phone numbers found");
//   }

//   try {
//     const sendResult = await sendArkeselSMS({
//       apiKey: resolvedKey.apiKey,
//       sender: senderId,
//       message,
//       recipients: normalizedRecipients.map((r) => r.phone),
//     });

//     const savedLogs = await Promise.all(
//       normalizedRecipients.map((recipient) =>
//         createSmsLog({
//           recipientId: recipient.memberId || recipient.phone,
//           recipientName: recipient.name || recipient.phone,
//           recipientPhone: recipient.phone,
//           message,
//           type: "manual",
//           status: "sent",
//           sentAt: new Date(),
//           createdBy: req.user?.id || "system",
//         })
//       )
//     );

//     res.status(201).json({
//       success: true,
//       data: {
//         provider: "arkesel",
//         sender: senderId,
//         message,
//         recipients: normalizedRecipients.length,
//         logs: savedLogs.map(mapSmsLog),
//         upstream: sendResult,
//         balance,
//         apiKeySource: resolvedKey.source,
//       },
//     });
//   } catch (error) {
//     const failureReason = error instanceof Error ? error.message : "SMS delivery failed";
//     await Promise.all(
//       normalizedRecipients.map((recipient) =>
//         createSmsLog({
//           recipientId: recipient.memberId || recipient.phone,
//           recipientName: recipient.name || recipient.phone,
//           recipientPhone: recipient.phone,
//           message,
//           type: "manual",
//           status: "failed",
//           failureReason,
//           createdBy: req.user?.id || "system",
//         })
//       )
//     );
//     throw new HttpError(502, `Arkesel delivery failed: ${failureReason}`);
//   }
// });

export const sendSms = asyncHandler(async (req: Request, res: Response) => {
  const message = ensureString(req.body.message, "message");
  const sender = req.body.sender
    ? ensureString(req.body.sender, "sender")
    : "ChurchCMS";
  const logType: SmsLogTypeInput = req.body.type === "automation" ? "automation" : "manual";

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

  const senderId = String(
    settings.smsSenderId || env.ARKESEL_SENDER_ID || sender
  ).trim();

  const resolvedKey = await resolveArkeselApiKey({
    configuredApiKey: String(settings.smsApiKey || "").trim(),
    fallbackApiKey: env.ARKESEL_API_KEY,
  });

  const balance =
    resolvedKey.balance ||
    (await getArkeselBalance({
      apiKey: resolvedKey.apiKey,
    }));

  const smsBalanceNumber =
    typeof balance.smsBalance === "number"
      ? balance.smsBalance
      : Number(String(balance.smsBalance || "").replace(/[^\d.-]/g, ""));

  if (!Number.isFinite(smsBalanceNumber) || smsBalanceNumber <= 0) {
    throw new HttpError(
      402,
      `Insufficient SMS balance on the selected Arkesel API key. SMS balance: ${
        balance.smsBalance ?? "0"
      }. Please top up this key and try again.`
    );
  }

  const normalizedRecipients = recipients
    .map((recipient) => ({
      ...recipient,
      phone: normalizePhone(String(recipient.phone || "")),
    }))
    .filter((recipient) => Boolean(recipient.phone));

  if (normalizedRecipients.length === 0) {
    throw new HttpError(400, "No valid recipient phone numbers found");
  }

  const churchName = settings.churchName || "Church";

  try {
    const savedLogs = [];
    const sendResults = [];

    for (const recipient of normalizedRecipients) {
      const personalizedMessage = message
        .replaceAll("{{name}}", recipient.name || "")
        .replaceAll("{{church_name}}", churchName);

      const sendResult = await sendArkeselSMS({
        apiKey: resolvedKey.apiKey,
        sender: senderId,
        message: personalizedMessage,
        recipients: [recipient.phone],
      });

      sendResults.push(sendResult);

      const log = await createSmsLog({
        recipientId: recipient.memberId || recipient.phone,
        recipientName: recipient.name || recipient.phone,
        recipientPhone: recipient.phone,
        message: personalizedMessage,
        type: logType,
        status: "sent",
        sentAt: new Date(),
        createdBy: req.user?.id || "system",
      });

      savedLogs.push(log);
    }

    res.status(201).json({
      success: true,
      data: {
        provider: "arkesel",
        sender: senderId,
        recipients: normalizedRecipients.length,
        logs: savedLogs.map(mapSmsLog),
        upstream: sendResults,
        balance,
        apiKeySource: resolvedKey.source,
      },
    });
  } catch (error) {
    const failureReason =
      error instanceof Error
        ? error.message
        : "SMS delivery failed";

    await Promise.all(
      normalizedRecipients.map((recipient) => {
        const personalizedMessage = message
          .replaceAll("{{name}}", recipient.name || "")
          .replaceAll("{{church_name}}", churchName);

        return createSmsLog({
          recipientId: recipient.memberId || recipient.phone,
          recipientName: recipient.name || recipient.phone,
          recipientPhone: recipient.phone,
          message: personalizedMessage,
          type: logType,
          status: "failed",
          failureReason,
          createdBy: req.user?.id || "system",
        });
      })
    );

    throw new HttpError(
      502,
      `Arkesel delivery failed: ${failureReason}`
    );
  }
});

export const getSmsLogs = asyncHandler(async (_req: Request, res: Response) => {
  const logs = await listSmsLogs();
  res.json({
    success: true,
    data: logs.map(mapSmsLog),
  });
});

export const getSmsBalance = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
  if (!settings?.smsEnabled) {
    throw new HttpError(400, "SMS is disabled in Settings");
  }

  const provider = String(settings.smsProvider || "").toLowerCase();
  if (provider !== "arkesel") {
    throw new HttpError(400, "SMS provider is not configured to Arkesel");
  }

  const resolvedKey = await resolveArkeselApiKey({
    configuredApiKey: String(settings.smsApiKey || "").trim(),
    fallbackApiKey: env.ARKESEL_API_KEY,
  });
  const balance = resolvedKey.balance || (await getArkeselBalance({ apiKey: resolvedKey.apiKey }));
  res.json({
    success: true,
    data: {
      ...balance,
      apiKeySource: resolvedKey.source,
      apiKeyPreview: `${resolvedKey.apiKey.slice(0, 4)}...${resolvedKey.apiKey.slice(-4)}`,
    },
  });
});
