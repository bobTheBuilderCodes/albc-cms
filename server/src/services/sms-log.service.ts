import SmsLog, { ISmsLog, SmsLogStatus, SmsLogType } from "../modules/sms/sms-log.model";
import { upsertSmsLogCache } from "./sms-log.cache";

type CreateSmsLogInput = {
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  type: SmsLogType;
  status: SmsLogStatus;
  sentAt?: Date;
  failureReason?: string;
  programId?: string;
  createdBy: string;
};

export const createSmsLog = async (input: CreateSmsLogInput): Promise<ISmsLog> => {
  const log = await SmsLog.create(input);
  upsertSmsLogCache(log);
  return log;
};

export const listSmsLogs = async (limit = 500): Promise<ISmsLog[]> => {
  return SmsLog.find().sort({ createdAt: -1 }).limit(limit);
};

export const mapSmsLog = (log: ISmsLog) => ({
  id: String(log._id),
  recipientId: log.recipientId,
  recipientName: log.recipientName,
  recipientPhone: log.recipientPhone,
  message: log.message,
  type: log.type,
  status: log.status,
  sentAt: log.sentAt?.toISOString(),
  failureReason: log.failureReason,
  programId: log.programId,
  createdBy: log.createdBy,
  createdAt: log.createdAt?.toISOString() || new Date().toISOString(),
});
