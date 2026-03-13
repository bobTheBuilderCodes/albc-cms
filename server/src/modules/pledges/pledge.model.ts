import mongoose, { Document, Schema } from "mongoose";

export type PledgeStatus = "pending" | "paid" | "cancelled";

export interface IPledge extends Document {
  member: mongoose.Types.ObjectId;
  amount: number;
  pledgeDate: Date;
  expectedDate?: Date;
  description?: string;
  status: PledgeStatus;
  paidAt?: Date;
  financeTransaction?: mongoose.Types.ObjectId;
}

const pledgeSchema = new Schema<IPledge>(
  {
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    amount: { type: Number, required: true, min: 0 },
    pledgeDate: { type: Date, required: true },
    expectedDate: { type: Date },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paidAt: { type: Date },
    financeTransaction: { type: Schema.Types.ObjectId, ref: "Finance" },
  },
  { timestamps: true }
);

export default mongoose.model<IPledge>("Pledge", pledgeSchema);
