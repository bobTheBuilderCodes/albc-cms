import mongoose, { Document, Schema } from "mongoose";

export interface IMember extends Document {
  firstName: string;
  lastName: string;
  gender?: "male" | "female";
  maritalStatus?: "single" | "married" | "widowed" | "divorced";
  membershipStatus?: "active" | "inactive";
  department?: string;
  departments?: string[];
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
    gender: { type: String, enum: ["male", "female"], default: "male" },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "widowed", "divorced"],
      default: "single",
    },
    membershipStatus: { type: String, enum: ["active", "inactive"], default: "active" },
    department: { type: String, trim: true, default: "General" },
    departments: [{ type: String, trim: true }],
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: Date },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

memberSchema.pre("save", function () {
  const member = this as IMember;
  const normalized = Array.isArray(member.departments)
    ? Array.from(
        new Set(
          member.departments
            .map((dept) => String(dept || "").trim())
            .filter(Boolean)
        )
      )
    : [];

  member.departments = normalized;
  if (normalized.length > 0) {
    member.department = normalized[0];
  } else if (!member.department) {
    member.department = "General";
  }
});

export default mongoose.model<IMember>("Member", memberSchema);
