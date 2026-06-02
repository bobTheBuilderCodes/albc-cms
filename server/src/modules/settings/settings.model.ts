import mongoose, { Document, Schema } from "mongoose";

export type AutomationConditionType = "weekly" | "monthly" | "custom";
export type AutomationAudienceType = "all" | "department" | "manual";

export interface IAutomationRule {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  templateContent: string;
  conditionType: AutomationConditionType;
  audienceType: AutomationAudienceType;
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
}

export interface ISettings extends Document {
  churchName: string;
  address?: string;
  phone?: string;
  email?: string;
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey?: string;
  smsSenderId?: string;
  departments: string[];
  enableBirthdayNotifications: boolean;
  birthdayMessageTemplate: string;
  birthdaySendDaysBefore: number;
  birthdaySendTime: string;
  enableProgramReminders: boolean;
  enableMemberAddedNotifications: boolean;
  enableDonationNotifications: boolean;
  enableUserAddedNotifications: boolean;
  programNotificationTemplate: string;
  memberAddedNotificationTemplate: string;
  donationNotificationTemplate: string;
  userAddedNotificationTemplate: string;
  automations: IAutomationRule[];
}

const automationRuleSchema = new Schema<IAutomationRule>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    templateId: { type: String, required: true, trim: true },
    templateName: { type: String, required: true, trim: true },
    templateContent: { type: String, required: true, trim: true },
    conditionType: { type: String, enum: ["weekly", "monthly", "custom"], required: true },
    audienceType: { type: String, enum: ["all", "department", "manual"], required: true },
    audienceDepartment: { type: String, trim: true },
    manualNumbers: { type: String, trim: true },
    scheduleLabel: { type: String, required: true, trim: true },
    dayOfWeek: [{ type: String, trim: true }],
    dayOfMonth: { type: Number },
    customRule: { type: String, trim: true },
    sendTime: { type: String, trim: true, default: "08:00" },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunKey: { type: String, trim: true },
    createdBy: { type: String, trim: true },
  },
  { _id: false, timestamps: true }
);

const settingsSchema = new Schema<ISettings>(
  {
    churchName: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    smsEnabled: { type: Boolean, default: false },
    smsProvider: { type: String, default: "arkesel", trim: true },
    smsApiKey: { type: String, trim: true },
    smsSenderId: { type: String, trim: true },
    departments: { type: [String], default: [] },
    enableBirthdayNotifications: { type: Boolean, default: true },
    birthdayMessageTemplate: {
      type: String,
      trim: true,
      default: "Happy Birthday {{name}}! May God's blessings overflow in your life today and always. - {{church_name}}",
    },
    birthdaySendDaysBefore: { type: Number, default: 0, min: 0, max: 30 },
    birthdaySendTime: { type: String, trim: true, default: "08:00" },
    enableProgramReminders: { type: Boolean, default: true },
    enableMemberAddedNotifications: { type: Boolean, default: true },
    enableDonationNotifications: { type: Boolean, default: true },
    enableUserAddedNotifications: { type: Boolean, default: true },
    programNotificationTemplate: {
      type: String,
      trim: true,
      default:
        "A new church program has been added.\nProgram: {{program_title}}\nDate: {{program_date}}\nLocation: {{program_location}}\nDetails: {{program_description}}\n- {{church_name}}",
    },
    memberAddedNotificationTemplate: {
      type: String,
      trim: true,
      default:
        "Hello {{member_name}}, welcome to our church family. Your membership profile has been created successfully. - {{church_name}}",
    },
    donationNotificationTemplate: {
      type: String,
      trim: true,
      default:
        "Hello {{member_name}},\nA new finance entry has been recorded.\nType: {{entry_type}}\nAmount: {{amount}}\nNote: {{note}}\n- {{church_name}}",
    },
    userAddedNotificationTemplate: {
      type: String,
      trim: true,
      default:
        "Hello {{user_name}},\nYour account has been created.\nEmail: {{user_email}}\nPassword: {{password}}\nRole: {{role}}\nPlease log in and change your password immediately.\n- {{church_name}}",
    },
    automations: { type: [automationRuleSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>("Settings", settingsSchema);
