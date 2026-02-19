import cors from "cors";
import express from "express";
import authRoutes from "./modules/auth/auth.router";
import userRoutes from "./modules/users/user.routes";
import memberRoutes from "./modules/members/member.routes";
import programRoutes from "./modules/programs/program.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import financeRoutes from "./modules/finance/finance.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import smsRoutes from "./modules/sms/sms.routes";
import { errorHandler, notFound } from "./middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "API is healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sms", smsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
