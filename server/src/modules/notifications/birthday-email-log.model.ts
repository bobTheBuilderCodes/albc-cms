import mongoose, { Document, Schema } from "mongoose";

export interface IBirthdayEmailLog extends Document {
  memberId: mongoose.Types.ObjectId;
  dateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const birthdayEmailLogSchema = new Schema<IBirthdayEmailLog>(
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

birthdayEmailLogSchema.index({ memberId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model<IBirthdayEmailLog>("BirthdayEmailLog", birthdayEmailLogSchema);
