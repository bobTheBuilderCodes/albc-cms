import mongoose, { Document, Schema } from "mongoose";

export interface IMember extends Document {
  firstName: string;
  lastName: string;
  department?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date;
  joinDate?: Date;
}

const memberSchema = new Schema<IMember>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "General" },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IMember>("Member", memberSchema);
