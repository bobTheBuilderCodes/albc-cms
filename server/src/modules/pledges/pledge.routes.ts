import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import {
  convertPledgeToIncome,
  createPledge,
  deletePledge,
  getPledges,
  updatePledge,
} from "./pledge.controllers";

const router = Router();

router.use(protect);

router.get("/", getPledges);
router.post("/", authorize("Admin", "Finance"), createPledge);
router.put("/:id", authorize("Admin", "Finance"), updatePledge);
router.delete("/:id", authorize("Admin", "Finance"), deletePledge);
router.post("/:id/convert", authorize("Admin", "Finance"), convertPledgeToIncome);

export default router;
