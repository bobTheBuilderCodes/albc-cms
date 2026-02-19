import mongoose, { Document, Schema } from "mongoose";

export interface ISundayAttendance extends Document {
  year: number;
  sundayKey: string;
  sundayDate: Date;
  member: mongoose.Types.ObjectId;
  status: "Present" | "Absent";
}

const sundayAttendanceSchema = new Schema<ISundayAttendance>(
  {
    year: { type: Number, required: true, index: true },
    sundayKey: { type: String, required: true, trim: true },
    sundayDate: { type: Date, required: true },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    status: { type: String, enum: ["Present", "Absent"], required: true, default: "Present" },
  },
  { timestamps: true }
);

sundayAttendanceSchema.index({ year: 1, sundayKey: 1, member: 1 }, { unique: true });
sundayAttendanceSchema.index({ member: 1, year: 1 });

export default mongoose.model<ISundayAttendance>("SundayAttendance", sundayAttendanceSchema);
