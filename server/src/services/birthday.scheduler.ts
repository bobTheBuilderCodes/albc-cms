import { notificationService } from "./notification.service";

export const startBirthdayScheduler = (): void => {
  const run = async () => {
    try {
      await notificationService.runDailyBirthdayNotifications();
      await notificationService.runDueProgramReminders();
    } catch (error) {
      console.error("Birthday notification job failed", error);
    }
  };

  run().catch(() => undefined);
  setInterval(() => {
    run().catch(() => undefined);
  }, 60 * 1000);
};
