import mongoose, { Document, Schema } from "mongoose";

export interface IProgram extends Document {
  title: string;
  description?: string;
  date: Date;
  location?: string;
}

const programSchema = new Schema<IProgram>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Program = mongoose.model<IProgram>("Program", programSchema);
