import { env } from "../config/env";
import { notificationService } from "./notification.service";

const getMillisecondsUntilHour = (hour: number): number => {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
};

export const startBirthdayScheduler = (): void => {
  const run = async () => {
    try {
      await notificationService.runDailyBirthdayNotifications();
    } catch (error) {
      console.error("Birthday notification job failed", error);
    }
  };

  run().catch(() => undefined);

  const delay = getMillisecondsUntilHour(env.BIRTHDAY_EMAIL_HOUR);
  setTimeout(() => {
    run().catch(() => undefined);
    setInterval(() => {
      run().catch(() => undefined);
    }, 24 * 60 * 60 * 1000);
  }, delay);
};
