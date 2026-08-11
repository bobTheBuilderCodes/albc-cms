import Member, { IMember } from "../modules/members/member.model";
import Settings from "../modules/settings/settings.model";
import User, { IUser } from "../modules/users/user.model";
import BirthdayEmailLog from "../modules/notifications/birthday-email-log.model";
import SmsLog from "../modules/sms/sms-log.model";
import InAppNotification, {
  InAppNotificationType,
} from "../modules/notifications/in-app-notification.model";
import { Program } from "../modules/programs/programs.model";
import { buildBrandedEmail, emailService } from "./email.service";
import { resolveArkeselApiKey, sendArkeselSMS } from "./arkesel.service";
import { env } from "../config/env";
import { createSmsLog } from "./sms-log.service";

const TIME_ZONE = "Africa/Accra";

type FinanceNotificationInput = {
  type: string;
  amount: number;
  note?: string;
  createdByName?: string;
  memberId?: string;
};

type ProgramNotificationInput = {
  title: string;
  description?: string;
  date: Date;
  location?: string;
};

const memberDisplayName = (member: Pick<IMember, "firstName" | "lastName">): string => {
  return `${member.firstName} ${member.lastName}`.trim();
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const todayDateKey = (): string => {
  return formatDateKeyInTimeZone(new Date());
};

const formatDateKeyInTimeZone = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year || "0000"}-${parts.month || "00"}-${parts.day || "00"}`;
};

const getMonthDayInTimeZone = (date: Date): { month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    month: Number(parts.month || -1),
    day: Number(parts.day || -1),
  };
};

const isSameMonthDay = (date: Date, target: Date): boolean => {
  const dateParts = getMonthDayInTimeZone(date);
  const targetParts = getMonthDayInTimeZone(target);
  return dateParts.month === targetParts.month && dateParts.day === targetParts.day;
};

const getLocalHourMinute = (date: Date): { hour: number; minute: number } => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    hour: Number(parts.hour || -1),
    minute: Number(parts.minute || -1),
  };
};

const isWithinRunWindow = (
  currentHour: number,
  currentMinute: number,
  targetHour: number,
  targetMinute: number,
  graceMinutes = 10
): boolean => {
  const currentTotal = currentHour * 60 + currentMinute;
  const targetTotal = targetHour * 60 + targetMinute;

  return currentTotal >= targetTotal && currentTotal <= targetTotal + graceMinutes;
};

const parseTime = (value?: string): { hour: number; minute: number } => {
  const match = String(value || "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 8, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const applyBirthdayTemplate = (template: string, name: string, churchName: string): string => {
  return template
    .split("{{name}}")
    .join(name)
    .split("{{church_name}}")
    .join(churchName);
};

const applyBirthdayBroadcastTemplate = (template: string, name: string, churchName: string): string => {
  return template
    .split("{{name}}")
    .join(name)
    .split("{{church_name}}")
    .join(churchName);
};

const applyBirthdayBroadcastTemplateWithPhone = (
  template: string,
  name: string,
  churchName: string,
  phone: string
): string => {
  return applyBirthdayBroadcastTemplate(template, name, churchName)
    .split("{{phone}}")
    .join(phone)
    .split("{{member_phone}}")
    .join(phone);
};

const formatReadableList = (items: string[]): string => {
  const cleaned = items.map((item) => String(item || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")} and ${cleaned[cleaned.length - 1]}`;
};

const getBirthdaySmsRecipientId = (memberId: string, dateKey: string): string => {
  return `birthday-sms-${memberId}-${dateKey}`;
};

const getBirthdayBroadcastRecipientId = (dateKey: string, recipientPhone: string): string => {
  return `birthday-broadcast-${dateKey}-${recipientPhone}`;
};

const applyTemplate = (template: string, replacements: Record<string, string>): string => {
  return Object.entries(replacements).reduce((output, [key, value]) => {
    return output.split(`{{${key}}}`).join(value);
  }, template);
};

const normalizePhoneForArkesel = (phone: string): string => {
  const cleaned = String(phone || "").trim().replace(/\s+/g, "");
  if (!cleaned) return "";
  const digits = cleaned.replace(/[^\d+]/g, "");
  const withoutPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
  if (withoutPlus.startsWith("233")) return withoutPlus;
  return withoutPlus;
};

const isValidEmail = (value: string): boolean => {
  const email = String(value || "").trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const uniqueEmails = (emails: string[]): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const email of emails) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized) || !isValidEmail(normalized)) continue;
    seen.add(normalized);
    cleaned.push(normalized);
  }
  return cleaned;
};

const uniquePhones = (phones: string[]): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const phone of phones) {
    const normalized = normalizePhoneForArkesel(String(phone || ""));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    cleaned.push(normalized);
  }
  return cleaned;
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const safeSize = Math.max(1, Math.trunc(size));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const getUserEmails = async (): Promise<string[]> => {
  const users = await User.find({ isActive: true }).select("email");
  return users.map((user) => String(user.email || "").trim()).filter(Boolean);
};

const getMemberEmails = async (): Promise<string[]> => {
  const members = await Member.find({ email: { $exists: true, $ne: "" } }).select("email");
  return uniqueEmails(members.map((member) => String(member.email || "").trim()));
};

const getMemberPhones = async (): Promise<string[]> => {
  const members = await Member.find({ phone: { $exists: true, $ne: "" } }).select("phone");
  return uniquePhones(members.map((member) => String(member.phone || "").trim()));
};

const sendSmsInBatches = async (input: {
  recipients: string[];
  sender: string;
  message: string;
  apiKey: string;
}): Promise<void> => {
  const recipients = uniquePhones(input.recipients);
  if (recipients.length === 0) return;

  const sendBatch = async (batch: string[], size: number): Promise<void> => {
    try {
      await sendArkeselSMS({
        apiKey: input.apiKey,
        sender: input.sender,
        message: input.message,
        recipients: batch,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (batch.length > 1 && (message.includes("socket close") || message.includes("unexpected socket close") || message.includes("timeout"))) {
        const smaller = chunkArray(batch, Math.max(1, Math.floor(size / 2)));
        for (const part of smaller) {
          await sendBatch(part, Math.max(1, Math.floor(size / 2)));
          await sleep(200);
        }
        return;
      }
      throw error;
    }
  };

  const batches = chunkArray(recipients, 50);
  for (let index = 0; index < batches.length; index += 1) {
    await sendBatch(batches[index], 50);
    if (index < batches.length - 1) {
      await sleep(250);
    }
  }
};

const sendBroadcastEmailInBatches = async (input: {
  recipients: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  const recipients = uniqueEmails(input.recipients);
  if (recipients.length === 0) return;

  const sendBatch = async (batch: string[], size: number): Promise<void> => {
    try {
      await emailService.send({
        to: [],
        bcc: batch,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (batch.length > 1 && (message.includes("socket close") || message.includes("unexpected socket close") || message.includes("timeout"))) {
        const smaller = chunkArray(batch, Math.max(1, Math.floor(size / 2)));
        for (const part of smaller) {
          await sendBatch(part, Math.max(1, Math.floor(size / 2)));
          await sleep(200);
        }
        return;
      }
      throw error;
    }
  };

  const batches = chunkArray(recipients, 25);
  for (let index = 0; index < batches.length; index += 1) {
    await sendBatch(batches[index], 25);
    if (index < batches.length - 1) {
      await sleep(250);
    }
  }
};

const createInAppNotificationForUsers = async (input: {
  type: InAppNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  dedupeKey?: string;
}): Promise<void> => {
  const users = await User.find({ isActive: true }).select("_id");
  const recipients = users.map((user) => user._id);
  if (recipients.length === 0) return;

  if (input.dedupeKey) {
    const existing = await InAppNotification.findOne({ dedupeKey: input.dedupeKey });
    if (existing) return;
  }

  await InAppNotification.create({
    type: input.type,
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl,
    recipients,
    dedupeKey: input.dedupeKey,
  });
};

const safeSend = async (task: () => Promise<void>, label: string): Promise<void> => {
  try {
    await task();
  } catch (error) {
    console.error(`Notification send failed: ${label}`, error);
  }
};

const getNotificationConfig = async () => {
  const settings = await Settings.findOne().select(
    "churchName smsEnabled smsProvider smsApiKey smsSenderId enableBirthdayNotifications birthdayMessageTemplate birthdayCongregationSmsTemplate birthdaySendDaysBefore birthdaySendTime enableProgramReminders enableMemberAddedNotifications enableDonationNotifications enableUserAddedNotifications programNotificationTemplate memberAddedNotificationTemplate donationNotificationTemplate userAddedNotificationTemplate"
  );

  return {
    churchName: settings?.churchName || "Church",
    smsEnabled: settings?.smsEnabled ?? false,
    smsProvider: String(settings?.smsProvider || "arkesel").toLowerCase(),
    smsApiKey: String(settings?.smsApiKey || env.ARKESEL_API_KEY || "").trim(),
    smsSenderId: String(settings?.smsSenderId || env.ARKESEL_SENDER_ID || "").trim(),
    birthday: settings?.enableBirthdayNotifications ?? true,
    birthdayMessageTemplate:
      settings?.birthdayMessageTemplate ||
      "Happy Birthday {{name}}! May God's blessings overflow in your life today and always. - {{church_name}}",
    birthdayCongregationSmsTemplate:
      settings?.birthdayCongregationSmsTemplate ||
      "Please join us in wishing {{name}} a happy birthday today. You can call them on {{phone}}. - {{church_name}}",
    birthdaySendDaysBefore: Number(settings?.birthdaySendDaysBefore ?? 0),
    birthdaySendTime: settings?.birthdaySendTime || "08:00",
    program: settings?.enableProgramReminders ?? true,
    memberAdded: settings?.enableMemberAddedNotifications ?? true,
    donation: settings?.enableDonationNotifications ?? true,
    userAdded: settings?.enableUserAddedNotifications ?? true,
    programNotificationTemplate:
      settings?.programNotificationTemplate ||
      "A new church program has been added.\nProgram: {{program_title}}\nDate: {{program_date}}\nLocation: {{program_location}}\nDetails: {{program_description}}\n- {{church_name}}",
    memberAddedNotificationTemplate:
      settings?.memberAddedNotificationTemplate ||
      "Hello {{member_name}}, welcome to our church family. Your membership profile has been created successfully. - {{church_name}}",
    donationNotificationTemplate:
      settings?.donationNotificationTemplate ||
      "Hello {{member_name}},\nA new finance entry has been recorded.\nType: {{entry_type}}\nAmount: {{amount}}\nNote: {{note}}\n- {{church_name}}",
    userAddedNotificationTemplate:
      settings?.userAddedNotificationTemplate ||
      "Hello {{user_name}},\nYour account has been created.\nEmail: {{user_email}}\nPassword: {{password}}\nRole: {{role}}\nPlease log in and change your password immediately.\n- {{church_name}}",
  };
};

export const notificationService = {
  async sendMemberWelcome(member: IMember): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.memberAdded) {
      console.log("Member welcome notification skipped: feature is disabled in settings.");
      return;
    }

    const name = memberDisplayName(member);
    await safeSend(
      () =>
        createInAppNotificationForUsers({
          type: "member_added",
          title: "New Member Added",
          message: `${name} has been added to members.`,
          actionUrl: "/members",
        }),
      "member in-app"
    );

    const recipient = String(member.email || "").trim();
    if (!recipient) return;

    const message = applyTemplate(config.memberAddedNotificationTemplate, {
      member_name: name,
      church_name: config.churchName,
    });
    await safeSend(
      () =>
        emailService.send({
          to: recipient,
          subject: `Welcome to ${config.churchName}`,
          text: message,
          html: buildBrandedEmail({
            churchName: config.churchName,
            title: "Welcome to the Church Family",
            message,
            previewText: `Welcome to ${config.churchName}`,
          }),
        }),
      "member welcome"
    );

    const smsPhone = normalizePhoneForArkesel(String(member.phone || ""));
    if (config.smsEnabled && config.smsProvider === "arkesel" && config.smsSenderId && smsPhone) {
      try {
        const resolvedKey = await resolveArkeselApiKey({
          configuredApiKey: config.smsApiKey,
          fallbackApiKey: env.ARKESEL_API_KEY,
        });
        await sendArkeselSMS({
          apiKey: resolvedKey.apiKey,
          sender: config.smsSenderId,
          message,
          recipients: [smsPhone],
        });

        await createSmsLog({
          recipientId: String(member._id || smsPhone),
          recipientName: name || smsPhone,
          recipientPhone: smsPhone,
          message,
          type: "announcement",
          status: "sent",
          sentAt: new Date(),
          createdBy: "system",
        });
      } catch (error) {
        const failureReason = error instanceof Error ? error.message : "SMS delivery failed";
        await createSmsLog({
          recipientId: String(member._id || smsPhone),
          recipientName: name || smsPhone,
          recipientPhone: smsPhone,
          message,
          type: "announcement",
          status: "failed",
          failureReason,
          createdBy: "system",
        });
        console.error("Notification send failed: member welcome sms", error);
      }
    }
  },

  async sendFinanceEntryNotification(payload: FinanceNotificationInput): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.donation) return;
    const isIncome = payload.type !== "Expense";
    let recipients: string[] = [];
    let memberName = "";

    if (isIncome && payload.memberId) {
      const member = await Member.findById(payload.memberId).select("firstName lastName email");
      const recipient = String(member?.email || "").trim();
      if (recipient) {
        recipients = [recipient];
        memberName = member
          ? `${String(member.firstName || "").trim()} ${String(member.lastName || "").trim()}`.trim()
          : "";
      }
    }

    if (recipients.length === 0) {
      recipients = await getUserEmails();
    }
    if (recipients.length === 0) return;

    const amount = Number(payload.amount).toLocaleString();
    const entryType = payload.type === "Expense" ? "Expenditure" : "Income";
    const message = applyTemplate(config.donationNotificationTemplate, {
      entry_type: payload.type,
      amount,
      note: payload.note || "-",
      member_name: memberName || "Member",
      church_name: config.churchName,
    });

    await safeSend(
      () =>
        emailService.send({
          to: recipients,
          subject: `New Finance Entry: ${entryType}`,
          text: message,
          html: buildBrandedEmail({
            churchName: config.churchName,
            title: isIncome ? "Income Received" : "New Expenditure Recorded",
            message,
            previewText: `${entryType} notification from ${config.churchName}`,
          }),
        }),
      "finance entry"
    );
  },

  async sendProgramCreatedNotification(payload: ProgramNotificationInput): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.program) return;

    await safeSend(
      () =>
        createInAppNotificationForUsers({
          type: "program_added",
          title: "New Program Created",
          message: `${payload.title} has been added to programs.`,
          actionUrl: "/programs",
        }),
      "program in-app"
    );

    const recipients = await getMemberEmails();
    if (recipients.length === 0) return;

    const message = applyTemplate(config.programNotificationTemplate, {
      program_title: payload.title,
      program_date: formatDate(new Date(payload.date)),
      program_location: payload.location || "-",
      program_description: payload.description || "-",
      church_name: config.churchName,
    });

    await safeSend(
      () =>
        emailService.send({
          to: recipients,
          subject: `New Church Program: ${payload.title}`,
          text: message,
          html: buildBrandedEmail({
            churchName: config.churchName,
            title: "New Program Announcement",
            message,
            previewText: `${payload.title} at ${config.churchName}`,
          }),
        }),
      "program created"
    );
  },

  async sendUserCreatedCredentialsEmail(user: IUser, plainPassword: string): Promise<void> {
    if (!user.email) return;
    const config = await getNotificationConfig();
    if (!config.userAdded) return;
    const message = applyTemplate(config.userAddedNotificationTemplate, {
      user_name: user.name,
      user_email: user.email,
      password: plainPassword,
      role: user.role,
      church_name: config.churchName,
    });

    await safeSend(
      () =>
        emailService.send({
          to: user.email,
          subject: "Your ChurchCMS Account Credentials",
          text: message,
          html: buildBrandedEmail({
            churchName: config.churchName,
            title: "Your Account Details",
            message,
            previewText: `${config.churchName} account credentials`,
            footerNote: "For security, change your password immediately after logging in.",
          }),
        }),
      "user created credentials"
    );
  },

  async runDailyBirthdayNotifications(): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.birthday) return;

    const now = new Date();
    const { hour, minute } = parseTime(config.birthdaySendTime);
    const localTime = getLocalHourMinute(now);
    console.log("[Birthday] job tick", {
      now: now.toISOString(),
      localTime: `${String(localTime.hour).padStart(2, "0")}:${String(localTime.minute).padStart(2, "0")}`,
      configuredTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      daysBefore: config.birthdaySendDaysBefore,
      enabled: config.birthday,
    });

    if (!isWithinRunWindow(localTime.hour, localTime.minute, hour, minute, 10)) {
      console.log("[Birthday] skipped: outside send window", {
        localTime,
        targetTime: { hour, minute },
      });
      return;
    }

    const targetDate = new Date(now);
    const daysBefore = Number.isFinite(config.birthdaySendDaysBefore)
      ? Math.max(0, Math.trunc(config.birthdaySendDaysBefore))
      : 0;
    targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);
    const birthdayDateKey = formatDateKeyInTimeZone(targetDate);
    const sendDayStart = new Date(now);
    sendDayStart.setUTCHours(0, 0, 0, 0);
    const sendDayEnd = new Date(now);
    sendDayEnd.setUTCHours(23, 59, 59, 999);
    const membersWithBirthdays = await Member.find({
      dateOfBirth: { $type: "date" },
    }).select("firstName lastName email phone dateOfBirth");

    const birthdayMembers = membersWithBirthdays.filter((member) => {
      if (!member.dateOfBirth) return false;
      return isSameMonthDay(new Date(member.dateOfBirth), targetDate);
    });

    if (birthdayMembers.length === 0) {
      console.log("[Birthday] no members due today", { birthdayDateKey });
      return;
    }

    const allCongregationMembers = await Member.find({ phone: { $exists: true, $ne: "" } }).select(
      "firstName lastName phone departments department"
    );
    const celebrantNames = birthdayMembers.map((member) => memberDisplayName(member));
    const celebrantPhones = uniquePhones(
      birthdayMembers.map((member) => String(member.phone || "").trim())
    );
    const congregationSmsMessage = applyBirthdayBroadcastTemplateWithPhone(
      config.birthdayCongregationSmsTemplate,
      formatReadableList(celebrantNames) || celebrantNames[0] || "our celebrant(s)",
      config.churchName,
      celebrantPhones.join(", ") || "N/A"
    );
    const broadcastSmsRecipientId = `birthday-broadcast-${birthdayDateKey}`;
    const congregationRecipientEntries = allCongregationMembers
      .map((congregationMember) => {
        const recipientPhone = normalizePhoneForArkesel(String(congregationMember.phone || ""));
        return {
          member: congregationMember,
          recipientPhone,
          recipientLogId: recipientPhone ? getBirthdayBroadcastRecipientId(birthdayDateKey, recipientPhone) : "",
        };
      })
      .filter((entry) => entry.recipientPhone && !celebrantPhones.includes(entry.recipientPhone));

    const sentBroadcastLogs =
      congregationRecipientEntries.length === 0
        ? []
        : await SmsLog.find({
            recipientId: { $in: congregationRecipientEntries.map((entry) => entry.recipientLogId) },
            type: "birthday_broadcast",
            status: "sent",
          }).select("recipientId");
    const sentBroadcastRecipientIds = new Set(sentBroadcastLogs.map((log) => log.recipientId));
    const recipientsToSend = congregationRecipientEntries.filter(
      (entry) => !sentBroadcastRecipientIds.has(entry.recipientLogId)
    );
    const existingBroadcastSummaryLog = await SmsLog.findOne({
      recipientId: broadcastSmsRecipientId,
      type: "birthday_broadcast",
    }).select("_id");

    if (
      config.smsEnabled &&
      config.smsProvider === "arkesel" &&
      config.smsSenderId &&
      recipientsToSend.length > 0
    ) {
      try {
        const resolvedKey = await resolveArkeselApiKey({
          configuredApiKey: config.smsApiKey,
          fallbackApiKey: env.ARKESEL_API_KEY,
        });

        const broadcastResults: Array<{ phone: string; sent: boolean; failureReason?: string }> = [];
        for (const entry of recipientsToSend) {
          const recipientPhone = entry.recipientPhone;
          const recipientName = memberDisplayName(entry.member);

          try {
            await sendArkeselSMS({
              apiKey: resolvedKey.apiKey,
              sender: config.smsSenderId,
              message: congregationSmsMessage,
              recipients: [recipientPhone],
            });

            await createSmsLog({
              recipientId: entry.recipientLogId,
              recipientName: recipientName || recipientPhone,
              recipientPhone,
              message: congregationSmsMessage,
              type: "birthday_broadcast",
              status: "sent",
              sentAt: new Date(),
              createdBy: "system",
            });

            broadcastResults.push({ phone: recipientPhone, sent: true });
          } catch (recipientError) {
            const failureReason =
              recipientError instanceof Error ? recipientError.message : "Birthday broadcast SMS failed";
            await createSmsLog({
              recipientId: entry.recipientLogId,
              recipientName: recipientName || recipientPhone,
              recipientPhone,
              message: congregationSmsMessage,
              type: "birthday_broadcast",
              status: "failed",
              failureReason,
              createdBy: "system",
            });
            broadcastResults.push({ phone: recipientPhone, sent: false, failureReason });
            console.error("[Birthday] congregation SMS recipient failed", {
              birthdayDateKey,
              recipientPhone,
              failureReason,
            });
          }
        }

        const successfulCount = broadcastResults.filter((result) => result.sent).length;
        const failedPhones = broadcastResults.filter((result) => !result.sent).map((result) => result.phone);

        if (!existingBroadcastSummaryLog) {
          await createSmsLog({
            recipientId: broadcastSmsRecipientId,
            recipientName: `Birthday broadcast for ${formatReadableList(celebrantNames) || celebrantNames[0] || "birthday celebrant(s)"}`,
            recipientPhone: "broadcast",
            message: congregationSmsMessage,
            type: "birthday_broadcast",
            status: successfulCount > 0 ? "sent" : "failed",
            sentAt: successfulCount > 0 ? new Date() : undefined,
            failureReason:
              failedPhones.length > 0
                ? successfulCount > 0
                  ? `Some recipients failed: ${failedPhones.join(", ")}`
                  : `All recipients failed: ${failedPhones.join(", ")}`
                : undefined,
            createdBy: "system",
          });
        }

        console.log("[Birthday] congregation SMS processed", {
          birthdayDateKey,
          celebrantCount: birthdayMembers.length,
          smsRecipientCount: congregationRecipientEntries.length,
          successfulRecipients: successfulCount,
          failedRecipients: failedPhones.length,
          alreadySentRecipients: congregationRecipientEntries.length - recipientsToSend.length,
        });
      } catch (error) {
        const failureReason = error instanceof Error ? error.message : "Birthday broadcast SMS failed";
        if (!existingBroadcastSummaryLog) {
          await createSmsLog({
            recipientId: broadcastSmsRecipientId,
            recipientName: `Birthday broadcast for ${formatReadableList(celebrantNames) || celebrantNames[0] || "birthday celebrant(s)"}`,
            recipientPhone: "broadcast",
            message: congregationSmsMessage,
            type: "birthday_broadcast",
            status: "failed",
            failureReason,
            createdBy: "system",
          });
        }
        console.error("[Birthday] congregation SMS failed", {
          birthdayDateKey,
          failureReason,
        });
      }
    } else {
      const reason = !config.smsEnabled
        ? "Skipped: SMS is disabled in settings"
        : config.smsProvider !== "arkesel"
        ? "Skipped: SMS provider is not Arkesel"
        : !config.smsSenderId
        ? "Skipped: SMS sender ID is not configured"
        : congregationRecipientEntries.length === 0
        ? "Skipped: no recipient phones on file"
        : "Skipped: all congregation recipients already processed";
      console.warn(`Birthday congregation SMS skipped: ${reason}`);
      if (!existingBroadcastSummaryLog) {
        await createSmsLog({
          recipientId: broadcastSmsRecipientId,
          recipientName: `Birthday broadcast for ${formatReadableList(celebrantNames) || celebrantNames[0] || "birthday celebrant(s)"}`,
          recipientPhone: "broadcast",
          message: congregationSmsMessage,
          type: "birthday_broadcast",
          status: "skipped",
          failureReason: reason,
          createdBy: "system",
        });
      }
    }

    for (const member of birthdayMembers) {
      const celebrantSmsRecipientId = getBirthdaySmsRecipientId(String(member._id), birthdayDateKey);
      const celebrantEmailLog = await BirthdayEmailLog.findOne({
        memberId: member._id,
        dateKey: birthdayDateKey,
      });
      const celebrantSmsLog = await SmsLog.findOne({
        recipientId: celebrantSmsRecipientId,
        type: "birthday",
        status: "sent",
      }).select("_id");
      const legacyCelebrantSmsLog = celebrantSmsLog
        ? null
        : await SmsLog.findOne({
            recipientId: String(member._id || ""),
            type: "birthday",
            status: "sent",
            sentAt: { $gte: sendDayStart, $lte: sendDayEnd },
          }).select("_id");
      const celebrantSentSmsLog = celebrantSmsLog || legacyCelebrantSmsLog;

      const fullName = memberDisplayName(member);
      const celebrantMessage = applyBirthdayTemplate(
        config.birthdayMessageTemplate,
        fullName,
        config.churchName
      );
      const celebrantEmail = String(member.email || "").trim();
      const celebrantPhone = normalizePhoneForArkesel(String(member.phone || ""));

      if (!celebrantEmailLog && celebrantEmail) {
        try {
          await emailService.send({
            to: celebrantEmail,
            subject: `Happy Birthday, ${fullName}!`,
            text: celebrantMessage,
            html: buildBrandedEmail({
              churchName: config.churchName,
              title: `Happy Birthday, ${fullName}!`,
              message: celebrantMessage,
              previewText: `Birthday wishes from ${config.churchName}`,
            }),
          });

          await BirthdayEmailLog.create({
            memberId: member._id,
            dateKey: birthdayDateKey,
          });
        } catch (error) {
          console.error("Notification send failed: birthday celebrant email", error);
        }
      } else if (!celebrantEmail) {
        console.warn(`Birthday email skipped for "${fullName}": no email on member record`);
      } else if (celebrantEmailLog) {
        console.log("[Birthday] celebrant email skipped: already processed", {
          memberId: String(member._id),
          birthdayDateKey,
        });
      }

      if (celebrantSentSmsLog) {
        console.log("[Birthday] celebrant SMS skipped: already processed", {
          memberId: String(member._id),
          birthdayDateKey,
        });
      } else if (!celebrantPhone) {
        const reason = "Skipped: no phone number on member record";
        console.warn(`Birthday SMS skipped for "${fullName}": ${reason}`);
        const existingSkippedLog = await SmsLog.findOne({
          recipientId: celebrantSmsRecipientId,
          type: "birthday",
        }).select("_id");
        if (!existingSkippedLog) {
          await createSmsLog({
            recipientId: celebrantSmsRecipientId,
            recipientName: fullName || celebrantPhone || "Birthday celebrant",
            recipientPhone: "N/A",
            message: celebrantMessage,
            type: "birthday",
            status: "skipped",
            failureReason: reason,
            createdBy: "system",
          });
        }
      } else if (!config.smsEnabled || config.smsProvider !== "arkesel" || !config.smsSenderId) {
        const reason = !config.smsEnabled
          ? "Skipped: SMS is disabled in settings"
          : config.smsProvider !== "arkesel"
          ? "Skipped: SMS provider is not Arkesel"
          : "Skipped: SMS sender ID is not configured";
        console.warn(`Birthday SMS skipped for "${fullName}": ${reason}`);
        const existingSkippedLog = await SmsLog.findOne({
          recipientId: celebrantSmsRecipientId,
          type: "birthday",
        }).select("_id");
        if (!existingSkippedLog) {
          await createSmsLog({
            recipientId: celebrantSmsRecipientId,
            recipientName: fullName || celebrantPhone || "Birthday celebrant",
            recipientPhone: celebrantPhone,
            message: celebrantMessage,
            type: "birthday",
            status: "skipped",
            failureReason: reason,
            createdBy: "system",
          });
        }
      } else {
        try {
          const resolvedKey = await resolveArkeselApiKey({
            configuredApiKey: config.smsApiKey,
            fallbackApiKey: env.ARKESEL_API_KEY,
          });

          await sendArkeselSMS({
            apiKey: resolvedKey.apiKey,
            sender: config.smsSenderId,
            message: celebrantMessage,
            recipients: [celebrantPhone],
          });

          await createSmsLog({
            recipientId: celebrantSmsRecipientId,
            recipientName: fullName || celebrantPhone,
            recipientPhone: celebrantPhone,
            message: celebrantMessage,
            type: "birthday",
            status: "sent",
            sentAt: new Date(),
            createdBy: "system",
          });
        } catch (error) {
          const failureReason = error instanceof Error ? error.message : "SMS delivery failed";
          await createSmsLog({
            recipientId: celebrantSmsRecipientId,
            recipientName: fullName || celebrantPhone,
            recipientPhone: celebrantPhone,
            message: celebrantMessage,
            type: "birthday",
            status: "failed",
            failureReason,
            createdBy: "system",
          });
          console.error("Notification send failed: birthday celebrant sms", error);
        }
      }

      console.log("[Birthday] processed", {
        memberId: String(member._id),
        member: fullName,
        birthdayDateKey,
      });
    }
  },

  async runDueProgramReminders(): Promise<void> {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const dateKey = todayDateKey();

    const duePrograms = await Program.find({
      date: { $gte: dayStart, $lte: dayEnd },
    }).select("title");

    for (const program of duePrograms) {
      await safeSend(
        () =>
          createInAppNotificationForUsers({
            type: "program_reminder",
            title: "Program Reminder",
            message: `${program.title} is due today.`,
            actionUrl: "/programs",
            dedupeKey: `program-reminder:${String(program._id)}:${dateKey}`,
          }),
        "program reminder in-app"
      );
    }
  },
};
