import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./in-app-notification.controllers";

const router = Router();

router.use(protect);

router.get("/me", getMyNotifications);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);

export default router;
