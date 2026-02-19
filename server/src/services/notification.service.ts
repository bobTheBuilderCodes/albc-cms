import Member, { IMember } from "../modules/members/member.model";
import Settings from "../modules/settings/settings.model";
import User, { IUser } from "../modules/users/user.model";
import BirthdayEmailLog from "../modules/notifications/birthday-email-log.model";
import { emailService } from "./email.service";

type FinanceNotificationInput = {
  type: string;
  amount: number;
  note?: string;
  createdByName?: string;
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

const getUserEmails = async (): Promise<string[]> => {
  const users = await User.find({ isActive: true }).select("email");
  return users.map((user) => String(user.email || "").trim()).filter(Boolean);
};

const getMemberEmails = async (): Promise<string[]> => {
  const members = await Member.find({ email: { $exists: true, $ne: "" } }).select("email");
  return members.map((member) => String(member.email || "").trim()).filter(Boolean);
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
    "churchName enableBirthdayNotifications birthdayMessageTemplate birthdaySendDaysBefore birthdaySendTime enableProgramReminders enableMemberAddedNotifications enableDonationNotifications enableUserAddedNotifications"
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
  };
};

export const notificationService = {
  async sendMemberWelcome(member: IMember): Promise<void> {
    if (!member.email) return;
    const config = await getNotificationConfig();
    if (!config.memberAdded) return;
    const recipient = String(member.email);

    const name = memberDisplayName(member);
    await safeSend(
      () =>
        emailService.send({
          to: recipient,
          subject: "Welcome to ChurchCMS",
          text: `Hello ${name}, welcome to our church family. Your membership profile has been created successfully.`,
        }),
      "member welcome"
    );
  },

  async sendFinanceEntryNotification(payload: FinanceNotificationInput): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.donation) return;

    const recipients = await getUserEmails();
    if (recipients.length === 0) return;

    const amount = Number(payload.amount).toLocaleString();
    const entryType = payload.type === "Expense" ? "Expenditure" : "Income";
    const note = payload.note ? `\nNote: ${payload.note}` : "";

    await safeSend(
      () =>
        emailService.send({
          to: recipients,
          subject: `New Finance Entry: ${entryType}`,
          text: `A new finance entry has been recorded.\nType: ${payload.type}\nAmount: ${amount}${note}`,
        }),
      "finance entry"
    );
  },

  async sendProgramCreatedNotification(payload: ProgramNotificationInput): Promise<void> {
    const config = await getNotificationConfig();
    if (!config.program) return;

    const recipients = await getMemberEmails();
    if (recipients.length === 0) return;

    const details = [
      `Program: ${payload.title}`,
      `Date: ${formatDate(new Date(payload.date))}`,
      payload.location ? `Location: ${payload.location}` : "",
      payload.description ? `Details: ${payload.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await safeSend(
      () =>
        emailService.send({
          to: recipients,
          subject: `New Church Program: ${payload.title}`,
          text: `A new church program has been added.\n\n${details}`,
        }),
      "program created"
    );
  },

  async sendUserCreatedCredentialsEmail(user: IUser, plainPassword: string): Promise<void> {
    if (!user.email) return;
    const config = await getNotificationConfig();
    if (!config.userAdded) return;

    await safeSend(
      () =>
        emailService.send({
          to: user.email,
          subject: "Your ChurchCMS Account Credentials",
          text: `Hello ${user.name},\nYour account has been created.\nEmail: ${user.email}\nPassword: ${plainPassword}\nRole: ${user.role}\nPlease log in and change your password immediately.`,
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
};
