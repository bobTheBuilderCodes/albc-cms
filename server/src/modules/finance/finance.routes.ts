import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
} from "./finance.controllers";

const router = Router();

router.use(protect);

router.post("/", authorize("Admin", "Finance"), createTransaction);
router.get("/", getTransactions);
router.get("/:id", getTransactionById);
router.put("/:id", authorize("Admin", "Finance"), updateTransaction);
router.delete("/:id", authorize("Admin", "Finance"), deleteTransaction);

export default router;
