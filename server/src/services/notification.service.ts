import Member, { IMember } from "../modules/members/member.model";
import Settings from "../modules/settings/settings.model";
import User, { IUser } from "../modules/users/user.model";
import BirthdayEmailLog from "../modules/notifications/birthday-email-log.model";
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

const getUserEmails = async (): Promise<string[]> => {
  const users = await User.find({ isActive: true }).select("email");
  return users.map((user) => String(user.email || "").trim()).filter(Boolean);
};

const getMemberEmails = async (): Promise<string[]> => {
  const members = await Member.find({ email: { $exists: true, $ne: "" } }).select("email");
  return members.map((member) => String(member.email || "").trim()).filter(Boolean);
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
    "churchName smsEnabled smsProvider smsApiKey smsSenderId enableBirthdayNotifications birthdayMessageTemplate birthdaySendDaysBefore birthdaySendTime enableProgramReminders enableMemberAddedNotifications enableDonationNotifications enableUserAddedNotifications programNotificationTemplate memberAddedNotificationTemplate donationNotificationTemplate userAddedNotificationTemplate"
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

    const allMemberEmails = await getMemberEmails();

    for (const member of birthdayMembers) {
      const existingLog = await BirthdayEmailLog.findOne({
        memberId: member._id,
        dateKey: birthdayDateKey,
      });

      if (existingLog) {
        console.log("[Birthday] skipped: already processed", {
          memberId: String(member._id),
          birthdayDateKey,
        });
        continue;
      }

      const fullName = memberDisplayName(member);
      await safeSend(
        () =>
          createInAppNotificationForUsers({
            type: "birthday",
            title: "Birthday Notification",
            message: `Today is ${fullName}'s birthday.`,
            actionUrl: `/members/${String(member._id)}`,
            dedupeKey: `birthday:${String(member._id)}:${birthdayDateKey}`,
          }),
        "birthday in-app"
      );

      const celebrantMessage = applyBirthdayTemplate(
        config.birthdayMessageTemplate,
        fullName,
        config.churchName
      );
      const celebrantEmail = String(member.email || "").trim();
      const others = celebrantEmail
        ? allMemberEmails.filter((email) => email.toLowerCase() !== celebrantEmail.toLowerCase())
        : allMemberEmails;

      if (others.length > 0) {
        await safeSend(
          () =>
            emailService.send({
              to: others,
              subject: `Wish ${fullName} a Happy Birthday`,
              text: `Today is ${fullName}'s birthday. Please send them your best wishes and prayers.`,
              html: buildBrandedEmail({
                churchName: config.churchName,
                title: "Birthday Reminder",
                message: `Today is ${fullName}'s birthday.\nPlease send your best wishes and prayers.`,
                previewText: `${fullName}'s birthday at ${config.churchName}`,
              }),
            }),
          "birthday broadcast"
        );
      }

      if (celebrantEmail) {
        await safeSend(
          () =>
            emailService.send({
              to: celebrantEmail,
              subject: `Happy Birthday, ${fullName}!`,
              text: celebrantMessage,
              html: buildBrandedEmail({
                churchName: config.churchName,
                title: `Happy Birthday, ${fullName}!`,
                message: celebrantMessage,
                previewText: `Birthday wishes from ${config.churchName}`,
              }),
            }),
          "birthday celebrant"
        );
      } else {
        console.warn(`Birthday email skipped for "${fullName}": no email on member record`);
      }

      const celebrantPhone = normalizePhoneForArkesel(String(member.phone || ""));
      if (config.smsEnabled && config.smsProvider === "arkesel" && config.smsSenderId && celebrantPhone) {
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
            recipientId: String(member._id || celebrantPhone),
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
            recipientId: String(member._id || celebrantPhone),
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
      } else {
        const reason = !celebrantPhone
          ? "Skipped: no phone number on member record"
          : !config.smsEnabled
          ? "Skipped: SMS is disabled in settings"
          : config.smsProvider !== "arkesel"
          ? "Skipped: SMS provider is not Arkesel"
          : "Skipped: SMS sender ID is not configured";
        console.warn(`Birthday SMS skipped for "${fullName}": ${reason}`);
        await createSmsLog({
          recipientId: String(member._id || celebrantPhone || fullName),
          recipientName: fullName || celebrantPhone || "Birthday celebrant",
          recipientPhone: celebrantPhone || "N/A",
          message: celebrantMessage,
          type: "birthday",
          status: "skipped",
          failureReason: reason,
          createdBy: "system",
        });
      }

      await BirthdayEmailLog.create({
        memberId: member._id,
        dateKey: birthdayDateKey,
      });

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
