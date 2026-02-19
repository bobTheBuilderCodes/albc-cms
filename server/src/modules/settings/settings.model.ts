import mongoose, { Document, Schema } from "mongoose";

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
  enableProgramReminders: boolean;
  enableMemberAddedNotifications: boolean;
  enableDonationNotifications: boolean;
  enableUserAddedNotifications: boolean;
}

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
    enableProgramReminders: { type: Boolean, default: true },
    enableMemberAddedNotifications: { type: Boolean, default: true },
    enableDonationNotifications: { type: Boolean, default: true },
    enableUserAddedNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>("Settings", settingsSchema);
