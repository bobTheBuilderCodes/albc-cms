import { refreshSmsLogCache } from "./sms-log.cache";

let smsLogSchedulerRunning = false;

export const startSmsLogRefreshScheduler = (): void => {
  const run = async (): Promise<void> => {
    if (smsLogSchedulerRunning) {
      console.log("[SMS Logs] cache refresh skipped: previous run still in progress");
      return;
    }

    smsLogSchedulerRunning = true;
    try {
      const logs = await refreshSmsLogCache();
      console.log(`[SMS Logs] cache refreshed (${logs.length} logs)`);
    } catch (error) {
      console.error("[SMS Logs] cache refresh failed", error);
    } finally {
      smsLogSchedulerRunning = false;
    }
  };

  console.log("[SMS Logs] cache refresh scheduler started");
  void run();
  setInterval(() => {
    void run();
  }, 13 * 60 * 1000);
};
