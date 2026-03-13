import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { ensureDate, ensureNumber, isDefined } from "../../utils/validators";
import Pledge from "./pledge.model";
import Finance from "../finance/finance.model";
import { notificationService } from "../../services/notification.service";

export const createPledge = asyncHandler(async (req: Request, res: Response) => {
  const pledge = await Pledge.create({
    member: req.body.member,
    amount: ensureNumber(req.body.amount, "amount"),
    pledgeDate: ensureDate(req.body.pledgeDate, "pledgeDate"),
    expectedDate: isDefined(req.body.expectedDate) ? ensureDate(req.body.expectedDate, "expectedDate") : undefined,
    description: req.body.description,
    status: "pending",
  });

  res.status(201).json({ success: true, data: pledge });
});

export const getPledges = asyncHandler(async (_: Request, res: Response) => {
  const pledges = await Pledge.find().populate("member").sort({ pledgeDate: -1 });
  res.json({ success: true, data: pledges });
});

export const updatePledge = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (isDefined(req.body.amount)) updates.amount = ensureNumber(req.body.amount, "amount");
  if (isDefined(req.body.pledgeDate)) updates.pledgeDate = ensureDate(req.body.pledgeDate, "pledgeDate");
  if (isDefined(req.body.expectedDate)) updates.expectedDate = ensureDate(req.body.expectedDate, "expectedDate");
  if (isDefined(req.body.description)) updates.description = req.body.description;
  if (isDefined(req.body.status)) updates.status = req.body.status;

  const pledge = await Pledge.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(
    "member"
  );
  if (!pledge) {
    throw new HttpError(404, "Pledge not found");
  }

  res.json({ success: true, data: pledge });
});

export const deletePledge = asyncHandler(async (req: Request, res: Response) => {
  const pledge = await Pledge.findByIdAndDelete(req.params.id);
  if (!pledge) {
    throw new HttpError(404, "Pledge not found");
  }
  res.json({ success: true, message: "Pledge deleted" });
});

export const convertPledgeToIncome = asyncHandler(async (req: Request, res: Response) => {
  const pledge = await Pledge.findById(req.params.id);
  if (!pledge) {
    throw new HttpError(404, "Pledge not found");
  }
  if (pledge.status === "paid") {
    throw new HttpError(400, "Pledge already marked as paid");
  }

  const transaction = await Finance.create({
    type: "Donation",
    amount: pledge.amount,
    member: pledge.member,
    note: `Pledge payment${pledge.description ? `: ${pledge.description}` : ""}`,
    date: new Date(),
  });

  pledge.status = "paid";
  pledge.paidAt = new Date();
  pledge.financeTransaction = transaction._id;
  await pledge.save();

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

  res.json({ success: true, data: pledge });
});
