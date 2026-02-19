import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  program: mongoose.Types.ObjectId;
  member: mongoose.Types.ObjectId;
  status: "Present" | "Absent";
}

const attendanceSchema = new Schema<IAttendance>(
  {
    program: { type: Schema.Types.ObjectId, ref: "Program", required: true },
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    status: { type: String, enum: ["Present", "Absent"], required: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ program: 1, member: 1 }, { unique: true });

export default mongoose.model<IAttendance>("Attendance", attendanceSchema);
