import mongoose, { Document, Schema } from "mongoose";

export type InAppNotificationType =
  | "birthday"
  | "program_reminder"
  | "member_added"
  | "program_added"
  | "finance_entry"
  | "system";

export interface IInAppNotification extends Document {
  type: InAppNotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  recipients: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
  dedupeKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inAppNotificationSchema = new Schema<IInAppNotification>(
  {
    type: {
      type: String,
      enum: ["birthday", "program_reminder", "member_added", "program_added", "finance_entry", "system"],
      required: true,
      trim: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    actionUrl: { type: String, trim: true },
    recipients: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
    dedupeKey: { type: String, trim: true, index: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInAppNotification>("InAppNotification", inAppNotificationSchema);
