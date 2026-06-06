import Member from "../modules/members/member.model";
import AutomationCollection from "../modules/automation/automation.model";
import Settings from "../modules/settings/settings.model";
import { env } from "../config/env";
import { resolveArkeselApiKey, sendArkeselSMS } from "./arkesel.service";
import { createSmsLog } from "./sms-log.service";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const TIME_ZONE = "Africa/Accra";
const RUN_GRACE_MINUTES = 10;
let automationSchedulerRunning = false;

type AutomationRule = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  templateContent: string;
  conditionType: "weekly" | "monthly" | "custom";
  audienceType: "all" | "department" | "manual";
  audienceDepartment?: string;
  manualNumbers?: string;
  scheduleLabel: string;
  dayOfWeek?: string[];
  dayOfMonth?: number;
  customRule?: string;
  sendTime?: string;
  isActive: boolean;
  lastRunAt?: Date;
  lastRunKey?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const normalizePhone = (phone: string): string => {
  const trimmed = String(phone || "").trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const withoutPlus = digitsOnly.startsWith("+") ? digitsOnly.slice(1) : digitsOnly;
  if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
  if (withoutPlus.startsWith("233")) return withoutPlus;
  return withoutPlus;
};

const parseTime = (value?: string): { hour: number; minute: number } => {
  const match = String(value || "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 8, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const getZonedParts = (date: Date): Record<string, string> => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
};

const getZonedDateKey = (date: Date): string => {
  const parts = getZonedParts(date);
  return `${parts.year || "0000"}-${parts.month || "00"}-${parts.day || "00"}`;
};

const mapAutomationRule = (automation: any): AutomationRule | null => {
  if (!automation) return null;
  const id = String(automation.id || automation._id || "").trim();
  if (!id) return null;

  return {
    id,
    name: String(automation.name || "").trim(),
    templateId: String(automation.templateId || "").trim(),
    templateName: String(automation.templateName || "").trim(),
    templateContent: String(automation.templateContent || "").trim(),
    conditionType: automation.conditionType,
    audienceType: automation.audienceType,
    audienceDepartment: String(automation.audienceDepartment || "").trim() || undefined,
    manualNumbers: String(automation.manualNumbers || "").trim() || undefined,
    scheduleLabel: String(automation.scheduleLabel || "").trim(),
    dayOfWeek: Array.isArray(automation.dayOfWeek)
      ? automation.dayOfWeek.map((day: string) => String(day || "").trim()).filter(Boolean)
      : [],
    dayOfMonth: automation.dayOfMonth === undefined ? undefined : Number(automation.dayOfMonth),
    customRule: String(automation.customRule || "").trim() || undefined,
    sendTime: String(automation.sendTime || "08:00").trim() || "08:00",
    isActive: automation.isActive === undefined ? true : Boolean(automation.isActive),
    lastRunAt: automation.lastRunAt ? new Date(automation.lastRunAt) : undefined,
    lastRunKey: String(automation.lastRunKey || "").trim() || undefined,
    createdBy: String(automation.createdBy || "").trim() || undefined,
    createdAt: automation.createdAt ? new Date(automation.createdAt) : undefined,
    updatedAt: automation.updatedAt ? new Date(automation.updatedAt) : undefined,
  };
};

const automationPriority = (automation: AutomationRule): number => {
  const baseTime = new Date(automation.lastRunAt || automation.updatedAt || automation.createdAt || 0).getTime();
  const runBonus = automation.lastRunAt ? 1_000_000_000_000_000 : 0;
  const keyBonus = automation.lastRunKey ? 1_000_000_000_000 : 0;
  return runBonus + keyBonus + baseTime;
};

const buildDateAtTime = (baseDate: Date, hour: number, minute: number): Date => {
  const date = new Date(baseDate);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
};

const getNextWeeklyRunAt = (automation: AutomationRule, now: Date): Date | null => {
  const days = Array.isArray(automation.dayOfWeek) ? automation.dayOfWeek : [];
  if (days.length === 0) return null;
  const { hour, minute } = parseTime(automation.sendTime || "08:00");

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const zoned = getZonedParts(candidate);
    const weekday = zoned.weekday || WEEK_DAYS[candidate.getUTCDay()];
    if (!days.includes(weekday)) continue;

    const scheduled = buildDateAtTime(candidate, hour, minute);
    const ageMinutes = (now.getTime() - scheduled.getTime()) / 60000;
    if (scheduled.getTime() <= now.getTime() && ageMinutes > RUN_GRACE_MINUTES) continue;
    return scheduled;
  }

  return null;
};

const getNextMonthlyRunAt = (automation: AutomationRule, now: Date): Date | null => {
  const dayOfMonth = Number(automation.dayOfMonth || 1);
  const { hour, minute } = parseTime(automation.sendTime || "08:00");

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1, hour, minute, 0, 0));
    const target = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), dayOfMonth, hour, minute, 0, 0));
    if (target.getUTCMonth() !== candidate.getUTCMonth()) continue;
    const ageMinutes = (now.getTime() - target.getTime()) / 60000;
    if (target.getTime() <= now.getTime() && ageMinutes > RUN_GRACE_MINUTES) continue;
    return target;
  }

  return null;
};

const getNextCustomRunAt = (automation: AutomationRule, now: Date): Date | null => {
  const rule = String(automation.customRule || "").trim().toLowerCase();
  if (!rule) return null;

  if (rule.includes("daily") || rule.includes("every day")) {
    const { hour, minute } = parseTime(automation.sendTime || "08:00");
    const today = buildDateAtTime(now, hour, minute);
    const ageMinutes = (now.getTime() - today.getTime()) / 60000;
    if (today.getTime() > now.getTime() || ageMinutes <= RUN_GRACE_MINUTES) return today;
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  const minuteInterval = rule.match(/every\s+(\d+)\s+minutes?/i);
  if (minuteInterval) {
    const interval = Math.max(1, Number(minuteInterval[1]));
    const next = new Date(now);
    next.setUTCSeconds(0, 0);
    const remainder = next.getUTCMinutes() % interval;
    const currentSlot = new Date(next);
    currentSlot.setUTCMinutes(next.getUTCMinutes() - remainder);
    const ageMinutes = (now.getTime() - currentSlot.getTime()) / 60000;
    if (currentSlot.getTime() <= now.getTime() && ageMinutes <= RUN_GRACE_MINUTES) {
      return currentSlot;
    }
    const future = new Date(currentSlot);
    future.setUTCMinutes(currentSlot.getUTCMinutes() + interval);
    return future;
  }

  const weekly = rule.match(/every\s+(\d+)\s+weeks?\s+on\s+(.+)/i);
  if (weekly) {
    const days = weekly[2]
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
    return getNextWeeklyRunAt({ ...automation, dayOfWeek: days }, now);
  }

  const monthly = rule.match(/every\s+(\d+)\s+months?\s+on\s+day\s+(\d+)/i);
  if (monthly) {
    return getNextMonthlyRunAt({ ...automation, dayOfMonth: Number(monthly[2]) }, now);
  }

  return null;
};

const getNextRunAt = (automation: AutomationRule, now: Date): Date | null => {
  if (automation.conditionType === "weekly") return getNextWeeklyRunAt(automation, now);
  if (automation.conditionType === "monthly") return getNextMonthlyRunAt(automation, now);
  if (automation.conditionType === "custom") return getNextCustomRunAt(automation, now);
  return null;
};

const buildRecipients = async (automation: AutomationRule): Promise<Array<{ memberId?: string; name: string; phone: string }>> => {
  if (automation.audienceType === "manual") {
    const rawNumbers = String(automation.manualNumbers || "")
      .split(/[\n,;\t ]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    return rawNumbers
      .map((phone) => normalizePhone(phone))
      .filter(Boolean)
      .map((phone) => ({ name: phone, phone }));
  }

  const members = await Member.find({ phone: { $exists: true, $ne: "" } }).select("firstName lastName phone departments department");
  const filteredMembers =
    automation.audienceType === "department" && automation.audienceDepartment
      ? members.filter((member) => {
          const departments = Array.isArray(member.departments) && member.departments.length > 0 ? member.departments : [member.department || "General"];
          return departments.includes(String(automation.audienceDepartment).trim());
        })
      : members;

  return filteredMembers
    .map((member) => ({
      memberId: String(member._id),
      name: `${String(member.firstName || "").trim()} ${String(member.lastName || "").trim()}`.trim() || String(member.phone || "").trim(),
      phone: normalizePhone(String(member.phone || "")),
    }))
    .filter((recipient) => Boolean(recipient.phone));
};

const runDueAutomation = async (automation: AutomationRule, churchName: string, senderId: string, apiKey: string): Promise<void> => {
  const now = new Date();
  const nextRunAt = getNextRunAt(automation, now);
  if (!nextRunAt) return;
  if (nextRunAt.getTime() > now.getTime()) return;

  const scheduleKey = `${automation.id}|${nextRunAt.toISOString()}`;
  const lastRunAtTime = automation.lastRunAt ? new Date(automation.lastRunAt).getTime() : null;
  const isStaleRunMarker =
    automation.lastRunKey === scheduleKey &&
    lastRunAtTime !== null &&
    lastRunAtTime + 60_000 < nextRunAt.getTime();
  if (automation.lastRunKey === scheduleKey && !isStaleRunMarker) return;
  if (isStaleRunMarker) {
    console.warn(
      `[Automation] "${automation.name}" has a stale run marker; allowing the current due occurrence to run`
    );
  }

  const recipients = await buildRecipients(automation);
  if (recipients.length === 0) {
    console.warn(`[Automation] "${automation.name}" skipped: no recipients matched the configured audience`);
    return;
  }
  console.log(
    `[Automation] evaluating "${automation.name}" occurrence=${nextRunAt.toISOString()} recipients=${recipients.length}`
  );
  let acceptedCount = 0;

  for (const recipient of recipients) {
    const message = String(automation.templateContent || "")
      .replaceAll("{{name}}", recipient.name || "")
      .replaceAll("{{member_name}}", recipient.name || "")
      .replaceAll("{{church_name}}", churchName);

    try {
      await sendArkeselSMS({
        apiKey,
        sender: senderId,
        message,
        recipients: [recipient.phone],
      });
      acceptedCount += 1;
      await createSmsLog({
        recipientId: recipient.memberId || recipient.phone,
        recipientName: recipient.name || recipient.phone,
        recipientPhone: recipient.phone,
        message,
        type: "automation",
        status: "sent",
        sentAt: now,
        createdBy: "system",
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : "SMS delivery failed";
      await createSmsLog({
        recipientId: recipient.memberId || recipient.phone,
        recipientName: recipient.name || recipient.phone,
        recipientPhone: recipient.phone,
        message,
        type: "automation",
        status: "failed",
        failureReason,
        createdBy: "system",
      });
    }
  }

  if (acceptedCount === 0) return;

  automation.lastRunAt = now;
  automation.lastRunKey = scheduleKey;
  automation.updatedAt = now;
  console.log(
    `[Automation] sent "${automation.name}" (occurrence: ${nextRunAt.toISOString()}, ${acceptedCount}/${recipients.length} accepted)`
  );
}

export const runDueAutomations = async (): Promise<void> => {
  const settings = await Settings.findOne();
  if (!settings?.smsEnabled) {
    console.warn("[Automation] scheduler skipped: SMS is disabled in Settings");
    return;
  }
  if (String(settings.smsProvider || "").toLowerCase() !== "arkesel") {
    console.warn("[Automation] scheduler skipped: SMS provider is not Arkesel");
    return;
  }

  const fromSettings = Array.isArray(settings.automations) ? (settings.automations as AutomationRule[]) : [];
  const fromCollection = (await AutomationCollection.find().sort({ createdAt: -1 }))
    .map(mapAutomationRule)
    .filter(Boolean) as AutomationRule[];

  const automations = (() => {
    const merged = new Map<string, AutomationRule>();
    for (const source of [fromSettings, fromCollection]) {
      for (const automation of source) {
        if (!automation?.id) continue;
        const existing = merged.get(automation.id);
        if (!existing || automationPriority(automation) >= automationPriority(existing)) {
          merged.set(automation.id, automation);
        }
      }
    }
    return Array.from(merged.values()).sort((a, b) => automationPriority(b) - automationPriority(a));
  })();

  const shouldSyncSettings =
    fromCollection.some((automation) => !fromSettings.some((item) => item.id === automation.id)) ||
    fromCollection.some((automation) => {
      const matching = fromSettings.find((item) => item.id === automation.id);
      return matching ? automationPriority(automation) > automationPriority(matching) : false;
    });

  if (shouldSyncSettings && automations.length > 0) {
    await Settings.findByIdAndUpdate(settings._id, { automations, updatedAt: new Date() }).catch(() => undefined);
  }
  if (automations.length === 0) return;

  const resolvedKey = await resolveArkeselApiKey({
    configuredApiKey: String(settings.smsApiKey || "").trim(),
    fallbackApiKey: env.ARKESEL_API_KEY,
  });
  const senderId = String(settings.smsSenderId || env.ARKESEL_SENDER_ID || "ChurchCMS").trim();
  const churchName = settings.churchName || "Church";

  let changed = false;
  for (const automation of automations) {
    if (!automation?.isActive) continue;
    const beforeRunKey = automation.lastRunKey;
    await runDueAutomation(automation, churchName, senderId, resolvedKey.apiKey);
    if (automation.lastRunKey !== beforeRunKey) {
      changed = true;
    }
  }

  if (changed) {
    await Settings.findByIdAndUpdate(settings._id, { automations, updatedAt: new Date() });
    for (const automation of automations) {
      if (!automation?.lastRunKey || !automation?.id) continue;
      await AutomationCollection.findByIdAndUpdate(
        automation.id,
        {
          lastRunAt: automation.lastRunAt,
          lastRunKey: automation.lastRunKey,
          updatedAt: new Date(),
        },
        { new: false }
      ).catch(() => undefined);
    }
  }
};

export const startAutomationScheduler = (): void => {
  const run = async () => {
    if (automationSchedulerRunning) {
      console.log("[Automation] scheduler skipped: previous run still in progress");
      return;
    }
    automationSchedulerRunning = true;
    try {
      await runDueAutomations();
    } catch (error) {
      console.error("Automation scheduler failed", error);
    } finally {
      automationSchedulerRunning = false;
    }
  };

  console.log("[Automation] scheduler started");
  void run();
  setInterval(() => {
    void run();
  }, 60 * 1000);
};
