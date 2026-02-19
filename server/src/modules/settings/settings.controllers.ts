import { Request, Response } from "express";
import Settings from "./settings.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureString, isDefined } from "../../utils/validators";
import { emailService } from "../../services/email.service";

const defaultProgramNotificationTemplate =
  "A new church program has been added.\nProgram: {{program_title}}\nDate: {{program_date}}\nLocation: {{program_location}}\nDetails: {{program_description}}\n- {{church_name}}";
const defaultMemberAddedNotificationTemplate =
  "Hello {{member_name}}, welcome to our church family. Your membership profile has been created successfully. - {{church_name}}";
const defaultDonationNotificationTemplate =
  "A new finance entry has been recorded.\nType: {{entry_type}}\nAmount: {{amount}}\nNote: {{note}}\n- {{church_name}}";
const defaultUserAddedNotificationTemplate =
  "Hello {{user_name}},\nYour account has been created.\nEmail: {{user_email}}\nPassword: {{password}}\nRole: {{role}}\nPlease log in and change your password immediately.\n- {{church_name}}";

export const createSettings = asyncHandler(async (req: Request, res: Response) => {
  const existingSettings = await Settings.findOne();
  if (existingSettings) {
    throw new HttpError(409, "Settings already exist. Use update instead.");
  }

const settings = await Settings.create({
    churchName: ensureString(req.body.churchName, "churchName"),
    address: req.body.address,
    phone: req.body.phone,
    email: req.body.email,
    smsEnabled: Boolean(req.body.smsEnabled),
    smsProvider: req.body.smsProvider || "arkesel",
    smsApiKey: req.body.smsApiKey,
    smsSenderId: req.body.smsSenderId,
    departments: Array.isArray(req.body.departments) ? req.body.departments : [],
    enableBirthdayNotifications:
      req.body.enableBirthdayNotifications === undefined
        ? true
        : Boolean(req.body.enableBirthdayNotifications),
    birthdayMessageTemplate:
      typeof req.body.birthdayMessageTemplate === "string" && req.body.birthdayMessageTemplate.trim().length > 0
        ? req.body.birthdayMessageTemplate.trim()
        : "Happy Birthday {{name}}! May God's blessings overflow in your life today and always. - {{church_name}}",
    birthdaySendDaysBefore:
      req.body.birthdaySendDaysBefore === undefined ? 0 : Number(req.body.birthdaySendDaysBefore),
    birthdaySendTime:
      typeof req.body.birthdaySendTime === "string" && req.body.birthdaySendTime.trim().length > 0
        ? req.body.birthdaySendTime.trim()
        : "08:00",
    enableProgramReminders:
      req.body.enableProgramReminders === undefined
        ? true
        : Boolean(req.body.enableProgramReminders),
    enableMemberAddedNotifications:
      req.body.enableMemberAddedNotifications === undefined
        ? true
        : Boolean(req.body.enableMemberAddedNotifications),
    enableDonationNotifications:
      req.body.enableDonationNotifications === undefined
        ? true
        : Boolean(req.body.enableDonationNotifications),
    enableUserAddedNotifications:
      req.body.enableUserAddedNotifications === undefined
        ? true
        : Boolean(req.body.enableUserAddedNotifications),
    programNotificationTemplate:
      typeof req.body.programNotificationTemplate === "string" &&
      req.body.programNotificationTemplate.trim().length > 0
        ? req.body.programNotificationTemplate.trim()
        : defaultProgramNotificationTemplate,
    memberAddedNotificationTemplate:
      typeof req.body.memberAddedNotificationTemplate === "string" &&
      req.body.memberAddedNotificationTemplate.trim().length > 0
        ? req.body.memberAddedNotificationTemplate.trim()
        : defaultMemberAddedNotificationTemplate,
    donationNotificationTemplate:
      typeof req.body.donationNotificationTemplate === "string" &&
      req.body.donationNotificationTemplate.trim().length > 0
        ? req.body.donationNotificationTemplate.trim()
        : defaultDonationNotificationTemplate,
    userAddedNotificationTemplate:
      typeof req.body.userAddedNotificationTemplate === "string" &&
      req.body.userAddedNotificationTemplate.trim().length > 0
        ? req.body.userAddedNotificationTemplate.trim()
        : defaultUserAddedNotificationTemplate,
  });

  res.status(201).json({ success: true, data: settings });
});

export const getSettings = asyncHandler(async (_: Request, res: Response) => {
  const settings = await Settings.findOne();
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (isDefined(req.body.churchName)) updates.churchName = ensureString(req.body.churchName, "churchName");
  if (isDefined(req.body.address)) updates.address = req.body.address;
  if (isDefined(req.body.phone)) updates.phone = req.body.phone;
  if (isDefined(req.body.email)) updates.email = req.body.email;
  if (isDefined(req.body.smsEnabled)) updates.smsEnabled = Boolean(req.body.smsEnabled);
  if (isDefined(req.body.smsProvider)) updates.smsProvider = req.body.smsProvider;
  if (isDefined(req.body.smsApiKey)) updates.smsApiKey = req.body.smsApiKey;
  if (isDefined(req.body.smsSenderId)) updates.smsSenderId = req.body.smsSenderId;
  if (isDefined(req.body.departments)) {
    updates.departments = Array.isArray(req.body.departments) ? req.body.departments : [];
  }
  if (isDefined(req.body.enableBirthdayNotifications)) {
    updates.enableBirthdayNotifications = Boolean(req.body.enableBirthdayNotifications);
  }
  if (isDefined(req.body.birthdayMessageTemplate)) {
    updates.birthdayMessageTemplate = String(req.body.birthdayMessageTemplate || "").trim();
  }
  if (isDefined(req.body.birthdaySendDaysBefore)) {
    updates.birthdaySendDaysBefore = Number(req.body.birthdaySendDaysBefore);
  }
  if (isDefined(req.body.birthdaySendTime)) {
    updates.birthdaySendTime = String(req.body.birthdaySendTime || "").trim();
  }
  if (isDefined(req.body.enableProgramReminders)) {
    updates.enableProgramReminders = Boolean(req.body.enableProgramReminders);
  }
  if (isDefined(req.body.enableMemberAddedNotifications)) {
    updates.enableMemberAddedNotifications = Boolean(req.body.enableMemberAddedNotifications);
  }
  if (isDefined(req.body.enableDonationNotifications)) {
    updates.enableDonationNotifications = Boolean(req.body.enableDonationNotifications);
  }
  if (isDefined(req.body.enableUserAddedNotifications)) {
    updates.enableUserAddedNotifications = Boolean(req.body.enableUserAddedNotifications);
  }
  if (isDefined(req.body.programNotificationTemplate)) {
    updates.programNotificationTemplate = String(req.body.programNotificationTemplate || "").trim();
  }
  if (isDefined(req.body.memberAddedNotificationTemplate)) {
    updates.memberAddedNotificationTemplate = String(req.body.memberAddedNotificationTemplate || "").trim();
  }
  if (isDefined(req.body.donationNotificationTemplate)) {
    updates.donationNotificationTemplate = String(req.body.donationNotificationTemplate || "").trim();
  }
  if (isDefined(req.body.userAddedNotificationTemplate)) {
    updates.userAddedNotificationTemplate = String(req.body.userAddedNotificationTemplate || "").trim();
  }

  const settings = await Settings.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!settings) {
    throw new HttpError(404, "Settings not found");
  }

  res.json({ success: true, data: settings });
});

export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  const to = ensureString(req.body.to, "to");

  if (!to.includes("@")) {
    throw new HttpError(400, "Provide a valid recipient email address.");
  }

  const emailStatus = emailService.getStatus();
  if (!emailStatus.enabled) {
    throw new HttpError(
      503,
      `Email service is disabled. ${emailStatus.reason || "Check SMTP configuration and server logs."}`
    );
  }

  await emailService.send({
    to,
    subject: "ChurchCMS SMTP Test",
    text: "SMTP is configured and sending successfully from ChurchCMS.",
  });

  res.json({ success: true, message: `Test email sent to ${to}` });
});
