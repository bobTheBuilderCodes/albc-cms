import Member, { IMember } from "../modules/members/member.model";
import Settings from "../modules/settings/settings.model";
import User, { IUser } from "../modules/users/user.model";
import BirthdayEmailLog from "../modules/notifications/birthday-email-log.model";
import InAppNotification, {
  InAppNotificationType,
} from "../modules/notifications/in-app-notification.model";
import { Program } from "../modules/programs/programs.model";
import { emailService } from "./email.service";

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
  return new Date().toISOString().slice(0, 10);
};

const isSameMonthDay = (date: Date, target: Date): boolean => {
  return date.getUTCMonth() === target.getUTCMonth() && date.getUTCDate() === target.getUTCDate();
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
    "churchName enableBirthdayNotifications birthdayMessageTemplate birthdaySendDaysBefore birthdaySendTime enableProgramReminders enableMemberAddedNotifications enableDonationNotifications enableUserAddedNotifications programNotificationTemplate memberAddedNotificationTemplate donationNotificationTemplate userAddedNotificationTemplate"
  );

  return {
    churchName: settings?.churchName || "Church",
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
      "A new finance entry has been recorded.\nType: {{entry_type}}\nAmount: {{amount}}\nNote: {{note}}\n- {{church_name}}",
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
          subject: "Welcome to ChurchCMS",
          text: message,
        }),
      "member welcome"
    );
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
        }),
      "user created credentials"
    );
  },

  async runDailyBirthdayNotifications(): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.birthday) return;

    const now = new Date();
    const { hour, minute } = parseTime(config.birthdaySendTime);
    if (now.getUTCHours() !== hour || now.getUTCMinutes() !== minute) return;

    const targetDate = new Date(now);
    const daysBefore = Number.isFinite(config.birthdaySendDaysBefore)
      ? Math.max(0, Math.trunc(config.birthdaySendDaysBefore))
      : 0;
    targetDate.setUTCDate(targetDate.getUTCDate() + daysBefore);
    const dateKey = todayDateKey();
    const membersWithBirthdays = await Member.find({
      dateOfBirth: { $exists: true, $ne: null },
      email: { $exists: true, $ne: "" },
    }).select("firstName lastName email dateOfBirth");

    const birthdayMembers = membersWithBirthdays.filter((member) => {
      if (!member.dateOfBirth) return false;
      return isSameMonthDay(new Date(member.dateOfBirth), targetDate);
    });

    if (birthdayMembers.length === 0) return;

    const allMemberEmails = await getMemberEmails();

    for (const member of birthdayMembers) {
      const existingLog = await BirthdayEmailLog.findOne({
        memberId: member._id,
        dateKey,
      });

      if (existingLog) continue;

      const fullName = memberDisplayName(member);
      await safeSend(
        () =>
          createInAppNotificationForUsers({
            type: "birthday",
            title: "Birthday Notification",
            message: `Today is ${fullName}'s birthday.`,
            actionUrl: `/members/${String(member._id)}`,
            dedupeKey: `birthday:${String(member._id)}:${dateKey}`,
          }),
        "birthday in-app"
      );

      const celebrantMessage = applyBirthdayTemplate(
        config.birthdayMessageTemplate,
        fullName,
        config.churchName
      );
      const others = allMemberEmails.filter(
        (email) => email.toLowerCase() !== String(member.email).toLowerCase()
      );

      if (others.length > 0) {
        await safeSend(
          () =>
            emailService.send({
              to: others,
              subject: `Wish ${fullName} a Happy Birthday`,
              text: `Today is ${fullName}'s birthday. Please send them your best wishes and prayers.`,
            }),
          "birthday broadcast"
        );
      }

      await safeSend(
        () =>
          emailService.send({
            to: String(member.email),
            subject: `Happy Birthday, ${fullName}!`,
            text: celebrantMessage,
          }),
        "birthday celebrant"
      );

      await BirthdayEmailLog.create({
        memberId: member._id,
        dateKey,
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
