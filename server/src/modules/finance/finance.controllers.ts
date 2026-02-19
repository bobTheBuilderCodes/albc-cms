import { Request, Response } from "express";
import Finance from "./finance.model";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureDate, ensureNumber, isDefined } from "../../utils/validators";
import { notificationService } from "../../services/notification.service";

const financeTypes = ["Tithe", "Offering", "Donation", "Expense"];

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const type = req.body.type;
  if (!financeTypes.includes(type)) {
    throw new HttpError(400, "Invalid transaction type");
  }

  const transaction = await Finance.create({
    type,
    amount: ensureNumber(req.body.amount, "amount"),
    member: req.body.member,
    note: req.body.note,
    date: isDefined(req.body.date) ? ensureDate(req.body.date, "date") : undefined,
  });

  notificationService
    .sendFinanceEntryNotification({
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note,
      memberId: transaction.member ? String(transaction.member) : undefined,
    })
    .catch((error) => {
      console.error("Failed to send finance notification email", error);
    });

  res.status(201).json({ success: true, data: transaction });
});

export const getTransactions = asyncHandler(async (_: Request, res: Response) => {
  const transactions = await Finance.find().populate("member").sort({ date: -1 });
  res.json({ success: true, data: transactions });
});

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Finance.findById(req.params.id).populate("member");
  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }
  res.json({ success: true, data: transaction });
});

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};

  if (isDefined(req.body.type)) {
    if (!financeTypes.includes(req.body.type)) {
      throw new HttpError(400, "Invalid transaction type");
    }
    updates.type = req.body.type;
  }
  if (isDefined(req.body.amount)) updates.amount = ensureNumber(req.body.amount, "amount");
  if (isDefined(req.body.member)) updates.member = req.body.member;
  if (isDefined(req.body.note)) updates.note = req.body.note;
  if (isDefined(req.body.date)) updates.date = ensureDate(req.body.date, "date");

  const transaction = await Finance.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  res.json({ success: true, data: transaction });
});

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Finance.findByIdAndDelete(req.params.id);
  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }
  res.json({ success: true, message: "Transaction deleted" });
});
