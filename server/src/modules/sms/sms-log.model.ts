import mongoose, { Document, Schema } from "mongoose";

export type SmsLogType = "program_reminder" | "birthday" | "manual" | "announcement";
export type SmsLogStatus = "sent" | "failed" | "pending";

export interface ISmsLog extends Document {
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  type: SmsLogType;
  status: SmsLogStatus;
  sentAt?: Date;
  failureReason?: string;
  programId?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const smsLogSchema = new Schema<ISmsLog>(
  {
    recipientId: { type: String, required: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    recipientPhone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["program_reminder", "birthday", "manual", "announcement"],
      default: "manual",
    },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    sentAt: { type: Date },
    failureReason: { type: String, trim: true },
    programId: { type: String, trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISmsLog>("SmsLog", smsLogSchema);
