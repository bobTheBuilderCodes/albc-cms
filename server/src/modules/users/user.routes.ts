import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "./user.controllers";
import { protect } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/role.middleware";

const router = Router();

router.use(protect);

router.post("/", authorize("Admin"), createUser);
router.get("/", authorize("Admin", "Staff", "Finance"), getUsers);
router.get("/:id", authorize("Admin"), getUserById);
router.put("/:id", authorize("Admin"), updateUser);
router.delete("/:id", authorize("Admin"), deleteUser);

export default router;
