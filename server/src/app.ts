import cors from "cors";
import fs from "fs";
import path from "path";
import express from "express";
import authRoutes from "./modules/auth/auth.router";
import memberRoutes from "./modules/members/member.routes";
import automationRoutes from "./modules/automation/automation.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import smsRoutes from "./modules/sms/sms.routes";
import { getSmsBalance } from "./modules/sms/sms.controllers";
import { errorHandler, notFound } from "./middlewares/error.middleware";

const app = express();
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

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
app.get("/api/sms/balance", getSmsBalance);
app.get("/api/balance", getSmsBalance);
app.get("/sms/balance", getSmsBalance);

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (!req.accepts("html")) {
      next();
      return;
    }
    res.sendFile(clientIndexPath);
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
