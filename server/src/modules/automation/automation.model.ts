import mongoose, { Document, Schema } from "mongoose";

export type AutomationConditionType = "weekly" | "monthly" | "custom" | "one_time";
export type AutomationAudienceType = "all" | "department" | "manual";

export interface IAutomation extends Document {
  name: string;
  templateId: string;
  templateName: string;
  templateContent: string;
  conditionType: AutomationConditionType;
  audienceType: AutomationAudienceType;
  audienceDepartment?: string;
  manualNumbers?: string;
  scheduleLabel: string;
  dayOfWeek?: string[];
  dayOfMonth?: number;
  customRule?: string;
  oneTimeDate?: string;
  sendTime?: string;
  isActive: boolean;
  lastRunAt?: Date;
  lastRunKey?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const automationSchema = new Schema<IAutomation>(
  {
    name: { type: String, required: true, trim: true },
    templateId: { type: String, required: true, trim: true },
    templateName: { type: String, required: true, trim: true },
    templateContent: { type: String, required: true, trim: true },
    conditionType: {
      type: String,
      enum: ["weekly", "monthly", "custom", "one_time"],
      required: true,
    },
    audienceType: {
      type: String,
      enum: ["all", "department", "manual"],
      required: true,
    },
    audienceDepartment: { type: String, trim: true },
    manualNumbers: { type: String, trim: true },
    scheduleLabel: { type: String, required: true, trim: true },
    dayOfWeek: [{ type: String, trim: true }],
    dayOfMonth: { type: Number },
    customRule: { type: String, trim: true },
    oneTimeDate: { type: String, trim: true },
    sendTime: { type: String, trim: true, default: "08:00" },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunKey: { type: String, trim: true },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true }
);

automationSchema.pre("save", function () {
  const automation = this as IAutomation;
  automation.dayOfWeek = Array.isArray(automation.dayOfWeek)
    ? Array.from(new Set(automation.dayOfWeek.map((day) => String(day || "").trim()).filter(Boolean)))
    : [];
  if (automation.oneTimeDate) {
    automation.oneTimeDate = String(automation.oneTimeDate || "").trim();
  }
});

export default mongoose.model<IAutomation>("Automation", automationSchema);
