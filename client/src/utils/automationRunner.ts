import { fetchAutomations, fetchMembers, fetchSettings, sendSmsBroadcast, updateAutomation } from "../api/backend";
import type { Automation } from "../types";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parseTime = (value?: string): { hour: number; minute: number } => {
  const match = String(value || "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 8, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
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

const getScheduleKey = (automation: Automation, now: Date): string => {
  const days = Array.isArray(automation.dayOfWeek) ? automation.dayOfWeek.join(",") : "";
  return [
    automation.conditionType,
    automation.sendTime || "08:00",
    automation.dayOfMonth || "",
    days,
    automation.customRule || "",
    now.toISOString().slice(0, 10),
  ].join("|");
};

const isDueNow = (automation: Automation, now: Date): boolean => {
  const { hour, minute } = parseTime(automation.sendTime || "08:00");
  if (now.getHours() !== hour || now.getMinutes() !== minute) return false;

  const currentDay = WEEK_DAYS[now.getDay()];
  const currentDate = now.getDate();
  const rule = String(automation.customRule || "").trim().toLowerCase();

  if (automation.conditionType === "weekly") {
    return (automation.dayOfWeek || []).includes(currentDay);
  }

  if (automation.conditionType === "monthly") {
    return Number(automation.dayOfMonth || 1) === currentDate;
  }

  if (automation.conditionType === "custom") {
    if (!rule) return false;
    if (rule.includes("daily") || rule.includes("every day")) return true;
    const weekly = rule.match(/every\s+(\d+)\s+weeks?\s+on\s+(.+)/i);
    if (weekly) {
      return weekly[2]
        .split(",")
        .map((day) => day.trim())
        .filter(Boolean)
        .includes(currentDay);
    }
    const monthly = rule.match(/every\s+(\d+)\s+months?\s+on\s+day\s+(\d+)/i);
    if (monthly) {
      return Number(monthly[2]) === currentDate;
    }
  }

  return false;
};

const getRecipients = async (automation: Automation): Promise<Array<{ memberId?: string; name: string; phone: string }>> => {
  if (automation.audienceType === "manual") {
    return String(automation.manualNumbers || "")
      .split(/[\n,;\t ]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((phone) => normalizePhone(phone))
      .filter(Boolean)
      .map((phone) => ({ phone, name: phone }));
  }

  const members = await fetchMembers();
  const filtered =
    automation.audienceType === "department" && automation.audienceDepartment
      ? members.filter((member) =>
          (member.departments?.length ? member.departments : [member.department || "General"]).includes(
            automation.audienceDepartment || ""
          )
        )
      : members;

  return filtered
    .map((member) => ({
      memberId: member.id,
      name: member.fullName,
      phone: normalizePhone(member.phoneNumber),
    }))
    .filter((recipient) => Boolean(recipient.phone));
};

const sendAutomation = async (automation: Automation, churchName: string) => {
  const recipients = await getRecipients(automation);
  if (recipients.length === 0) return;

  for (const recipient of recipients) {
    const message = String(automation.templateContent || "")
      .split("{{name}}")
      .join(recipient.name || "")
      .split("{{church_name}}")
      .join(churchName);

    try {
      await sendSmsBroadcast({
        message,
        recipients: [recipient],
        sender: undefined,
        type: "automation",
      });
    } catch {
      // Continue with remaining recipients; the SMS log captures failures on the server path.
    }
  }
};

export const startAutomationRuntime = (): void => {
  const tick = async () => {
    if (!localStorage.getItem("token")) return;

    try {
      const settings = await fetchSettings().catch(() => null);
      if (settings?.smsEnabled === false || String(settings?.smsProvider || "arkesel").toLowerCase() !== "arkesel") {
        return;
      }

      const automations = (await fetchAutomations()).filter((automation) => automation.isActive);
      const now = new Date();
      const churchName = settings?.churchName || "Church";

      for (const automation of automations) {
        const scheduleKey = getScheduleKey(automation, now);
        if (automation.lastRunKey === scheduleKey) continue;
        if (!isDueNow(automation, now)) continue;

        await sendAutomation(automation, churchName);
        await updateAutomation(automation.id, {
          lastRunAt: now.toISOString(),
          lastRunKey: scheduleKey,
        });
      }
    } catch {
      // keep quiet; automation should never interfere with the main app
    }
  };

  tick().catch(() => undefined);
  setInterval(() => {
    tick().catch(() => undefined);
  }, 60 * 1000);
};
