import mongoose, { Document, Schema } from "mongoose";

export type SoulCenterStatus = "pending" | "converted";

export interface ISoulCenterVisitor extends Document {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  visitDate: Date;
  invitedBy?: mongoose.Types.ObjectId;
  description?: string;
  status: SoulCenterStatus;
  convertedMemberId?: mongoose.Types.ObjectId;
}

const soulCenterSchema = new Schema<ISoulCenterVisitor>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    visitDate: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "Member" },
    description: { type: String, trim: true },
    status: { type: String, enum: ["pending", "converted"], default: "pending" },
    convertedMemberId: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  { timestamps: true }
);

export default mongoose.model<ISoulCenterVisitor>("SoulCenterVisitor", soulCenterSchema);
