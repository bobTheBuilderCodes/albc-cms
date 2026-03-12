import { env } from "../config/env";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string }; text?: string }>;
  output_text?: string;
  result?: string;
};

export const generateAiReply = async (messages: AiMessage[]): Promise<string> => {
  const endpoint = (env.AI_ENDPOINT || "").trim();
  const apiKey = (env.AI_CHAT_API_KEY || env.AI_API_KEY || "").trim();
  const model = (env.AI_MODEL || "").trim();

  if (!endpoint || !apiKey || !model) {
    throw new Error("AI service is not configured");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `AI request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.output_text ||
    data?.result;

  if (!content) {
    throw new Error("AI response did not contain any content");
  }

  return String(content).trim();
};
