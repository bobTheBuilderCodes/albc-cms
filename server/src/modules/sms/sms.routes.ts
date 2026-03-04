import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { getSmsLogs, sendSms } from "./sms.controllers";

const router = Router();

router.use(protect);
router.get("/logs", getSmsLogs);
router.post("/send", sendSms);

export default router;
