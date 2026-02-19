import { env } from "../config/env";

const ARKESEL_BASE_URL = "https://sms.arkesel.com/api/v2/sms/send";

type SendArkeselInput = {
  apiKey: string;
  sender: string;
  message: string;
  recipients: string[];
};

export const sendArkeselSMS = async ({
  apiKey,
  sender,
  message,
  recipients,
}: SendArkeselInput): Promise<any> => {
  const url = env.NODE_ENV === "production" ? ARKESEL_BASE_URL : ARKESEL_BASE_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      message,
      recipients,
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
        : `Arkesel request failed with status ${response.status}`;
    throw new Error(messageText);
  }

  return parsed;
};
