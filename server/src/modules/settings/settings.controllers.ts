import { Request, Response } from "express";
import Settings from "./settings.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureString, isDefined } from "../../utils/validators";

export const createSettings = asyncHandler(async (req: Request, res: Response) => {
  const existingSettings = await Settings.findOne();
  if (existingSettings) {
    throw new HttpError(409, "Settings already exist. Use update instead.");
  }

  const settings = await Settings.create({
    churchName: ensureString(req.body.churchName, "churchName"),
    address: req.body.address,
    phone: req.body.phone,
    email: req.body.email,
    smsEnabled: Boolean(req.body.smsEnabled),
    enableBirthdayNotifications:
      req.body.enableBirthdayNotifications === undefined
        ? true
        : Boolean(req.body.enableBirthdayNotifications),
    enableProgramReminders:
      req.body.enableProgramReminders === undefined
        ? true
        : Boolean(req.body.enableProgramReminders),
    enableMemberAddedNotifications:
      req.body.enableMemberAddedNotifications === undefined
        ? true
        : Boolean(req.body.enableMemberAddedNotifications),
    enableDonationNotifications:
      req.body.enableDonationNotifications === undefined
        ? true
        : Boolean(req.body.enableDonationNotifications),
    enableUserAddedNotifications:
      req.body.enableUserAddedNotifications === undefined
        ? true
        : Boolean(req.body.enableUserAddedNotifications),
  });

  res.status(201).json({ success: true, data: settings });
});

export const getSettings = asyncHandler(async (_: Request, res: Response) => {
  const settings = await Settings.findOne();
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (isDefined(req.body.churchName)) updates.churchName = ensureString(req.body.churchName, "churchName");
  if (isDefined(req.body.address)) updates.address = req.body.address;
  if (isDefined(req.body.phone)) updates.phone = req.body.phone;
  if (isDefined(req.body.email)) updates.email = req.body.email;
  if (isDefined(req.body.smsEnabled)) updates.smsEnabled = Boolean(req.body.smsEnabled);
  if (isDefined(req.body.enableBirthdayNotifications)) {
    updates.enableBirthdayNotifications = Boolean(req.body.enableBirthdayNotifications);
  }
  if (isDefined(req.body.enableProgramReminders)) {
    updates.enableProgramReminders = Boolean(req.body.enableProgramReminders);
  }
  if (isDefined(req.body.enableMemberAddedNotifications)) {
    updates.enableMemberAddedNotifications = Boolean(req.body.enableMemberAddedNotifications);
  }
  if (isDefined(req.body.enableDonationNotifications)) {
    updates.enableDonationNotifications = Boolean(req.body.enableDonationNotifications);
  }
  if (isDefined(req.body.enableUserAddedNotifications)) {
    updates.enableUserAddedNotifications = Boolean(req.body.enableUserAddedNotifications);
  }

  const settings = await Settings.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!settings) {
    throw new HttpError(404, "Settings not found");
  }

  res.json({ success: true, data: settings });
});
