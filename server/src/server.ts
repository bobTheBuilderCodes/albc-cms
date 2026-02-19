import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { startBirthdayScheduler } from "./services/birthday.scheduler";
import { seedAdmin } from "./utils/seedAdmin";

const startServer = async (): Promise<void> => {
  await connectDB();
  await seedAdmin();
  startBirthdayScheduler();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
