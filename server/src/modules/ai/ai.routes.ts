import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { chatWithAssistant } from "./ai.controllers";

const router = Router();

router.post("/chat", protect, chatWithAssistant);

export default router;
