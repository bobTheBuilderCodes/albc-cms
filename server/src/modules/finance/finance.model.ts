import mongoose, { Document, Schema } from "mongoose";

export type FinanceType = "Tithe" | "Offering" | "Donation" | "Expense";

export interface IFinance extends Document {
  type: FinanceType;
  amount: number;
  member?: mongoose.Types.ObjectId;
  note?: string;
  date: Date;
}

const financeSchema = new Schema<IFinance>(
  {
    type: {
      type: String,
      enum: ["Tithe", "Offering", "Donation", "Expense"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
    },
    note: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IFinance>("Finance", financeSchema);
