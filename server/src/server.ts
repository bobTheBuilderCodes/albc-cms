import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { startAutomationScheduler } from "./services/automation.scheduler";
import { startBirthdayScheduler } from "./services/birthday.scheduler";
import { startSmsLogRefreshScheduler } from "./services/sms-log.scheduler";
import { seedAdmin } from "./utils/seedAdmin";

const startServer = async (): Promise<void> => {
  await connectDB();
  await seedAdmin();
  startBirthdayScheduler();
  startAutomationScheduler();
  startSmsLogRefreshScheduler();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
