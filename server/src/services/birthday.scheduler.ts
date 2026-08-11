import { notificationService } from "./notification.service";

let birthdaySchedulerRunning = false;

export const startBirthdayScheduler = (): void => {
  const run = async () => {
    if (birthdaySchedulerRunning) {
      console.log("[Birthday] scheduler skipped: previous run still in progress");
      return;
    }

    birthdaySchedulerRunning = true;
    try {
      await notificationService.runDailyBirthdayNotifications();
    } catch (error) {
      console.error("Birthday notification job failed", error);
    } finally {
      birthdaySchedulerRunning = false;
    }
  };

  run().catch(() => undefined);
  setInterval(() => {
    run().catch(() => undefined);
  }, 60 * 1000);
};
