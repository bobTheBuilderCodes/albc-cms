import { env } from "../config/env";

const ARKESEL_V2_URL = "https://sms.arkesel.com/api/v2/sms/send";
const ARKESEL_LEGACY_URL = "https://sms.arkesel.com/sms/api";

type SendArkeselInput = {
  apiKey: string;
  sender: string;
  message: string;
  recipients: string[];
};

const isArkeselPayloadError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  const message = typeof data.message === "string" ? data.message : "";
  const code = typeof data.code === "string" ? data.code.toLowerCase() : "";
  const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
  const okFlag = typeof data.success === "boolean" ? data.success : undefined;

  if (okFlag === false) return message || "Arkesel returned success=false";
  if (status && status !== "success" && status !== "ok") return message || `Arkesel status: ${status}`;
  if (code && code !== "ok" && code !== "200" && code !== "1000") {
    return message || `Arkesel code: ${code}`;
  }

  return null;
};

export const sendArkeselSMS = async ({
  apiKey,
  sender,
  message,
  recipients,
}: SendArkeselInput): Promise<any> => {
  const sanitizedRecipients = recipients.map((recipient) => recipient.trim()).filter(Boolean);
  if (sanitizedRecipients.length === 0) {
    throw new Error("No valid recipients provided");
  }

  // First try Arkesel v2 JSON endpoint.
  try {
    const response = await fetch(ARKESEL_V2_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender,
        message,
        recipients: sanitizedRecipients,
      }),
    });

    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (response.ok) {
      const logicalError = isArkeselPayloadError(parsed);
      if (logicalError) {
        throw new Error(logicalError);
      }
      return { endpoint: "v2", data: parsed };
    }

    const maybeError =
      typeof parsed === "object" && parsed?.message
        ? String(parsed.message)
        : `Arkesel v2 request failed with status ${response.status}`;
    throw new Error(maybeError);
  } catch (v2Error) {
    // Fallback to legacy endpoint shown in Arkesel dashboard.
    const results = await Promise.all(
      sanitizedRecipients.map(async (recipient) => {
        const params = new URLSearchParams({
          action: "send-sms",
          api_key: apiKey,
          to: recipient,
          from: sender,
          sms: message,
          response: "json",
        });

        const url = `${ARKESEL_LEGACY_URL}?${params.toString()}`;
        const response = await fetch(url, { method: "GET" });
        const text = await response.text();

        let parsed: any = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          // keep raw text
        }

        if (!response.ok) {
          const messageText =
            typeof parsed === "object" && parsed?.message
              ? String(parsed.message)
              : `Arkesel legacy request failed with status ${response.status}`;
          throw new Error(messageText);
        }

        const logicalError = isArkeselPayloadError(parsed);
        if (logicalError) {
          throw new Error(logicalError);
        }

        return {
          recipient,
          data: parsed,
        };
      })
    );

    return {
      endpoint: "legacy",
      fallbackFrom: v2Error instanceof Error ? v2Error.message : "v2 failed",
      data: results,
    };
  }
};
