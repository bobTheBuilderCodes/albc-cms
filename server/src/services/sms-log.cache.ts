import SmsLog, { ISmsLog } from "../modules/sms/sms-log.model";

const SMS_LOG_CACHE_LIMIT = 500;

let cachedSmsLogs: ISmsLog[] = [];
let cacheRefreshedAt: Date | null = null;

export const refreshSmsLogCache = async (limit = SMS_LOG_CACHE_LIMIT): Promise<ISmsLog[]> => {
  const logs = await SmsLog.find().sort({ createdAt: -1 }).limit(limit);
  cachedSmsLogs = logs;
  cacheRefreshedAt = new Date();
  return cachedSmsLogs;
};

export const getCachedSmsLogs = (): ISmsLog[] => cachedSmsLogs;

export const upsertSmsLogCache = (log: ISmsLog): void => {
  const logId = String(log._id);
  cachedSmsLogs = [log, ...cachedSmsLogs.filter((entry) => String(entry._id) !== logId)].slice(0, SMS_LOG_CACHE_LIMIT);
  cacheRefreshedAt = new Date();
};

export const getSmsLogCacheMeta = (): { refreshedAt: Date | null; count: number } => ({
  refreshedAt: cacheRefreshedAt,
  count: cachedSmsLogs.length,
});
