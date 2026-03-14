import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, SendHorizontal } from "lucide-react";
import { chatWithAssistant } from "../api/backend";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function AiAssistant() {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = localStorage.getItem("ai_chat_history");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore invalid storage
      }
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I can answer questions about members, programs, attendance, finance, messaging, and how to use the system. Ask me anything.",
        createdAt: new Date().toISOString(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const historyPayload = useMemo(
    () =>
      messages
        .filter((msg) => msg.id !== "welcome")
        .slice(-12)
        .map((msg) => ({ role: msg.role, content: msg.content })),
    [messages]
  );

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("ai_chat_history", JSON.stringify(messages));
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast.info("Type a question first");
      return;
    }

    const now = new Date().toISOString();
    const outgoing: ChatMessage = {
      id: `${now}-user`,
      role: "user",
      content: trimmed,
      createdAt: now,
    };

    setMessages((prev) => [...prev, outgoing]);
    setInput("");
    setIsSending(true);

    try {
      const response = await chatWithAssistant({
        message: trimmed,
        history: historyPayload,
      });
      const reply: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "AI assistant failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    const starter: ChatMessage[] = [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I can answer questions about members, programs, attendance, finance, messaging, and how to use the system. Ask me anything.",
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(starter);
    localStorage.setItem("ai_chat_history", JSON.stringify(starter));
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">AI Assistant</h1>
              <p className="text-sm text-neutral-600">
                Ask questions about the church app. Your access level: {user?.role || "User"}.
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2 bg-white"
          >
            Clear chat
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-base ${
                  msg.role === "user"
                    ? "bg-linear-to-br from-indigo-500 to-blue-600 text-white"
                    : "bg-white border border-neutral-200 shadow-sm text-neutral-800 dark:text-slate-100 ai-bubble"
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                <div
                  className={`mt-2 text-[11px] ${
                    msg.role === "user" ? "text-white/80" : "text-neutral-400 dark:text-slate-400"
                  }`}
                >
                  {formatTimestamp(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollAnchorRef} />
        </div>

        <div className="border-t border-neutral-200 p-4 sm:p-5 bg-white">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend().catch(() => undefined);
                }
              }}
              rows={2}
              placeholder="Ask about members, programs, attendance, finance, messaging..."
              className="flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              onClick={() => handleSend().catch(() => undefined)}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-70"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
