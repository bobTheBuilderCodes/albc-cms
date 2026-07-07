import mongoose, { Document, Schema } from "mongoose";

export interface IBirthdayBroadcastLog extends Document {
  memberId: mongoose.Types.ObjectId;
  dateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const birthdayBroadcastLogSchema = new Schema<IBirthdayBroadcastLog>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

birthdayBroadcastLogSchema.index({ memberId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model<IBirthdayBroadcastLog>("BirthdayBroadcastLog", birthdayBroadcastLogSchema);
