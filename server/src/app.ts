import cors from "cors";
import express from "express";
import authRoutes from "./modules/auth/auth.router";
import memberRoutes from "./modules/members/member.routes";
import automationRoutes from "./modules/automation/automation.routes";
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
app.use("/api/members", memberRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sms", smsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
