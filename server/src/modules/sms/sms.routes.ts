import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { sendSms } from "./sms.controllers";

const router = Router();

router.use(protect);
router.post("/send", sendSms);

export default router;
