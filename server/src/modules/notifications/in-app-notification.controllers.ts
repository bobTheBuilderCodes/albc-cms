import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import InAppNotification from "./in-app-notification.model";

export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Not authorized" });
    return;
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const notifications = await InAppNotification.find({
    recipients: objectId,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const data = notifications.map((item) => ({
    id: item._id,
    type: item.type,
    title: item.title,
    message: item.message,
    actionUrl: item.actionUrl,
    timestamp: item.createdAt,
    isRead: item.readBy.some((reader) => String(reader) === userId),
  }));

  const unreadCount = data.filter((item) => !item.isRead).length;
  res.json({ success: true, data, unreadCount });
});

export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Not authorized" });
    return;
  }

  await InAppNotification.findOneAndUpdate(
    { _id: req.params.id, recipients: new mongoose.Types.ObjectId(userId) },
    { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
  );

  res.json({ success: true, message: "Notification marked as read" });
});

export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: "Not authorized" });
    return;
  }

  await InAppNotification.updateMany(
    { recipients: new mongoose.Types.ObjectId(userId) },
    { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
  );

  res.json({ success: true, message: "All notifications marked as read" });
});
