import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import Automation from "./automation.model";

const normalizeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
};

const mapAutomation = (automation: any) => ({
  id: String(automation._id),
  name: automation.name,
  templateId: automation.templateId,
  templateName: automation.templateName,
  templateContent: automation.templateContent,
  conditionType: automation.conditionType,
  audienceType: automation.audienceType,
  audienceDepartment: automation.audienceDepartment,
  manualNumbers: automation.manualNumbers,
  scheduleLabel: automation.scheduleLabel,
  dayOfWeek: automation.dayOfWeek || [],
  dayOfMonth: automation.dayOfMonth,
  customRule: automation.customRule,
  sendTime: automation.sendTime,
  isActive: automation.isActive,
  lastRunAt: automation.lastRunAt?.toISOString?.() || null,
  lastRunKey: automation.lastRunKey,
  createdBy: automation.createdBy,
  createdAt: automation.createdAt?.toISOString?.() || new Date().toISOString(),
  updatedAt: automation.updatedAt?.toISOString?.() || new Date().toISOString(),
});

export const getAutomations = asyncHandler(async (_req: Request, res: Response) => {
  const automations = await Automation.find().sort({ createdAt: -1 });
  res.json({ success: true, data: automations.map(mapAutomation) });
});

export const createAutomation = asyncHandler(async (req: Request, res: Response) => {
  const templateContent = String(req.body.templateContent || "").trim();
  if (!templateContent) throw new HttpError(400, "templateContent is required");

  const automation = await Automation.create({
    name: String(req.body.name || "").trim(),
    templateId: String(req.body.templateId || "").trim(),
    templateName: String(req.body.templateName || "").trim(),
    templateContent,
    conditionType: req.body.conditionType,
    audienceType: req.body.audienceType,
    audienceDepartment: String(req.body.audienceDepartment || "").trim() || undefined,
    manualNumbers: String(req.body.manualNumbers || "").trim() || undefined,
    scheduleLabel: String(req.body.scheduleLabel || "").trim(),
    dayOfWeek: normalizeArray(req.body.dayOfWeek),
    dayOfMonth: req.body.dayOfMonth === undefined ? undefined : Number(req.body.dayOfMonth),
    customRule: String(req.body.customRule || "").trim() || undefined,
    sendTime: String(req.body.sendTime || "08:00").trim() || "08:00",
    isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
    createdBy: req.user?.id,
  });

  res.status(201).json({ success: true, data: mapAutomation(automation) });
});

export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name || "").trim();
  if (req.body.templateId !== undefined) updates.templateId = String(req.body.templateId || "").trim();
  if (req.body.templateName !== undefined) updates.templateName = String(req.body.templateName || "").trim();
  if (req.body.templateContent !== undefined) updates.templateContent = String(req.body.templateContent || "").trim();
  if (req.body.conditionType !== undefined) updates.conditionType = req.body.conditionType;
  if (req.body.audienceType !== undefined) updates.audienceType = req.body.audienceType;
  if (req.body.audienceDepartment !== undefined) updates.audienceDepartment = String(req.body.audienceDepartment || "").trim() || undefined;
  if (req.body.manualNumbers !== undefined) updates.manualNumbers = String(req.body.manualNumbers || "").trim() || undefined;
  if (req.body.scheduleLabel !== undefined) updates.scheduleLabel = String(req.body.scheduleLabel || "").trim();
  if (req.body.dayOfWeek !== undefined) updates.dayOfWeek = normalizeArray(req.body.dayOfWeek);
  if (req.body.dayOfMonth !== undefined) updates.dayOfMonth = Number(req.body.dayOfMonth);
  if (req.body.customRule !== undefined) updates.customRule = String(req.body.customRule || "").trim() || undefined;
  if (req.body.sendTime !== undefined) updates.sendTime = String(req.body.sendTime || "08:00").trim() || "08:00";
  if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
  if (req.body.lastRunAt !== undefined) updates.lastRunAt = req.body.lastRunAt ? new Date(req.body.lastRunAt) : undefined;
  if (req.body.lastRunKey !== undefined) updates.lastRunKey = String(req.body.lastRunKey || "").trim() || undefined;

  const automation = await Automation.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!automation) throw new HttpError(404, "Automation not found");

  res.json({ success: true, data: mapAutomation(automation) });
});

export const deleteAutomation = asyncHandler(async (req: Request, res: Response) => {
  const automation = await Automation.findByIdAndDelete(req.params.id);
  if (!automation) throw new HttpError(404, "Automation not found");
  res.json({ success: true, message: "Automation deleted" });
});
