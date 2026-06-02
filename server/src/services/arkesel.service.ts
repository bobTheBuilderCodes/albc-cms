const ARKESEL_V2_URL = "https://sms.arkesel.com/api/v2/sms/send";
const ARKESEL_LEGACY_URL = "https://sms.arkesel.com/sms/api";
const ARKESEL_V1_CHECK_BALANCE_URL = "https://sms.arkesel.com/sms/api?action=check-balance";

type SendArkeselInput = {
  apiKey: string;
  sender: string;
  message: string;
  recipients: string[];
  scheduledDate?: string;
};

type ArkeselBalanceInput = {
  apiKey: string;
};

type ResolveArkeselKeyInput = {
  configuredApiKey?: string;
  fallbackApiKey?: string;
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

const normalizeApiKey = (value?: string): string => String(value || "").trim();

export const resolveArkeselApiKey = async ({
  configuredApiKey,
  fallbackApiKey,
}: ResolveArkeselKeyInput): Promise<{
  apiKey: string;
  source: "configured" | "fallback";
  balance: Awaited<ReturnType<typeof getArkeselBalance>> | null;
}> => {
  const candidates = [
    { apiKey: normalizeApiKey(configuredApiKey), source: "configured" as const },
    { apiKey: normalizeApiKey(fallbackApiKey), source: "fallback" as const },
  ].filter((entry, index, arr) => entry.apiKey && arr.findIndex((item) => item.apiKey === entry.apiKey) === index);

  if (candidates.length === 0) {
    throw new Error("Arkesel API key is missing");
  }

  let lastError: unknown = null;
  const successes: Array<{
    apiKey: string;
    source: "configured" | "fallback";
    balance: Awaited<ReturnType<typeof getArkeselBalance>>;
    smsBalance: number;
  }> = [];

  for (const candidate of candidates) {
    try {
      const balance = await getArkeselBalance({ apiKey: candidate.apiKey });
      const smsBalance =
        typeof balance.smsBalance === "number"
          ? balance.smsBalance
          : Number(String(balance.smsBalance || "").replace(/[^\d.-]/g, ""));
      successes.push({
        apiKey: candidate.apiKey,
        source: candidate.source,
        balance,
        smsBalance: Number.isFinite(smsBalance) ? smsBalance : 0,
      });
    } catch (error) {
      lastError = error;
    }
  }

  const positive = successes.find((entry) => entry.smsBalance > 0);
  if (positive) {
    return {
      apiKey: positive.apiKey,
      source: positive.source,
      balance: positive.balance,
    };
  }

  const firstSuccess = successes[0];
  if (firstSuccess) {
    return {
      apiKey: firstSuccess.apiKey,
      source: firstSuccess.source,
      balance: firstSuccess.balance,
    };
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Unable to resolve a valid Arkesel API key");
};

const parseArkeselBalancePayload = (payload: unknown): {
  smsBalance: number | string | null;
  mainBalance: number | string | null;
  raw: unknown;
} => {
  const raw = payload;
  if (!payload || typeof payload !== "object") {
    return { smsBalance: null, mainBalance: null, raw };
  }

  const data = payload as Record<string, any>;
  const nested = data.data && typeof data.data === "object" ? data.data : data;

  const smsBalance =
    nested.sms_balance ??
    nested.smsBalance ??
    nested.balance ??
    data.sms_balance ??
    data.smsBalance ??
    data.balance ??
    null;

  const mainBalance =
    nested.main_balance ??
    nested.mainBalance ??
    data.main_balance ??
    data.mainBalance ??
    null;

  return { smsBalance, mainBalance, raw };
};

const isRecoverableSmsFallbackError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("socket") ||
    normalized.includes("econnreset") ||
    normalized.includes("enotfound") ||
    normalized.includes("server error")
  );
};

export const sendArkeselSMS = async ({
  apiKey,
  sender,
  message,
  recipients,
  scheduledDate,
}: SendArkeselInput): Promise<any> => {
  const sanitizedRecipients = recipients.map((recipient) => recipient.trim()).filter(Boolean);
  if (sanitizedRecipients.length === 0) {
    throw new Error("No valid recipients provided");
  }

  if (scheduledDate) {
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
        scheduled_date: scheduledDate,
      }),
    });

    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      const maybeError =
        typeof parsed === "object" && parsed?.message
          ? String(parsed.message)
          : `Arkesel v2 scheduled request failed with status ${response.status}`;
      throw new Error(maybeError);
    }

    const logicalError = isArkeselPayloadError(parsed);
    if (logicalError) {
      throw new Error(logicalError);
    }

    return { endpoint: "v2-scheduled", data: parsed, request: { apiKey, sender, message, recipients: sanitizedRecipients, scheduledDate } };
  }

  // Prefer the documented SMS V1 flow for compatibility with multiple API keys.
  try {
    const payload = {
      action: "send-sms",
      api_key: apiKey,
      to: sanitizedRecipients.join(","),
      from: sender,
      sms: message,
    };
    const url = `${ARKESEL_LEGACY_URL}?action=send-sms&api_key=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(
      sanitizedRecipients.join(",")
    )}&from=${encodeURIComponent(sender)}&sms=${encodeURIComponent(message)}&response=json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      const maybeError =
        typeof parsed === "object" && parsed?.message
          ? String(parsed.message)
          : `Arkesel v2 request failed with status ${response.status}`;
      throw new Error(maybeError);
    }

    const logicalError = isArkeselPayloadError(parsed);
    if (logicalError) {
      throw new Error(logicalError);
    }
    return { endpoint: "v1", data: parsed, request: payload };
  } catch (v2Error) {
    const v2Message = v2Error instanceof Error ? v2Error.message : "v2 failed";
    const v2StatusHints = ["authentication failed", "insufficient balance", "inactive gateway", "validation"];
    if (!isRecoverableSmsFallbackError(v2Message) || v2StatusHints.some((hint) => v2Message.toLowerCase().includes(hint))) {
      throw v2Error;
    }

    // Fallback to v2 JSON endpoint if the legacy request fails for transport reasons.
    const results = await Promise.all(
      sanitizedRecipients.map(async (recipient) => {
        const response = await fetch(ARKESEL_V2_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            sender,
            message,
            recipients: [recipient],
          }),
        });
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
      endpoint: "v2",
      fallbackFrom: v2Message,
      data: results,
    };
  }
};

export const getArkeselBalance = async ({ apiKey }: ArkeselBalanceInput): Promise<{
  smsBalance: number | string | null;
  mainBalance: number | string | null;
  raw: unknown;
  endpoint: string;
}> => {
  const tryBalanceV1 = async () => {
    const url = `${ARKESEL_V1_CHECK_BALANCE_URL}&api_key=${encodeURIComponent(apiKey)}&response=json`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }
    if (!response.ok) {
      const maybeError =
        typeof parsed === "object" && parsed?.message
          ? String(parsed.message)
          : `Arkesel V1 balance request failed with status ${response.status}`;
      throw new Error(maybeError);
    }
    return { ...parseArkeselBalancePayload(parsed), endpoint: "v1" };
  };

  const tryBalanceV2 = async () => {
    const response = await fetch("https://sms.arkesel.com/api/v2/clients/balance-details", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
    });

    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!response.ok) {
      const maybeError =
        typeof parsed === "object" && parsed?.message
          ? String(parsed.message)
          : `Arkesel V2 balance request failed with status ${response.status}`;
      throw new Error(maybeError);
    }
    return { ...parseArkeselBalancePayload(parsed), endpoint: "v2" };
  };

  try {
    return await tryBalanceV1();
  } catch (v1Error) {
    try {
      return await tryBalanceV2();
    } catch (v2Error) {
      const v1Message = v1Error instanceof Error ? v1Error.message : "v1 balance failed";
      const v2Message = v2Error instanceof Error ? v2Error.message : "v2 balance failed";
      throw new Error(`Unable to fetch Arkesel balance. V1: ${v1Message}. V2: ${v2Message}`);
    }
  }
};
