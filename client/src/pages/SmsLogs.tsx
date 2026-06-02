import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Member, SMSLog } from '../types';
import { Pagination } from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchMembers, fetchSettings, fetchSmsLogs } from '../api/backend';
import { AlertTriangle, Clock, CheckCircle2, MessageSquare, Search, XCircle } from 'lucide-react';

export function SmsLogs() {
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const toast = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    loadData().catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to load SMS logs'));
  }, []);

  const loadData = async () => {
    const [memberData, settings] = await Promise.all([fetchMembers(), fetchSettings()]);
    checkAndSendBirthdayMessages(memberData, settings || undefined);

    const backendLogs = await fetchSmsLogs();
    const localLogs: SMSLog[] = JSON.parse(localStorage.getItem('cms_sms_logs') || '[]');
    const mergedLogs = [...backendLogs];
    const existingIds = new Set(backendLogs.map((log) => log.id));
    localLogs.forEach((log) => {
      if (!existingIds.has(log.id)) mergedLogs.push(log);
    });
    setSmsLogs(mergedLogs);
  };

  const checkAndSendBirthdayMessages = (
    membersData: Member[],
    settings?: {
      churchName?: string;
      enableBirthdayNotifications?: boolean;
      birthdayMessageTemplate?: string;
      birthdaySendDaysBefore?: number;
      birthdaySendTime?: string;
    }
  ) => {
    if (settings?.enableBirthdayNotifications === false) return;

    const today = new Date();
    const [hours = '08', minutes = '00'] = String(settings?.birthdaySendTime || '08:00').split(':');
    const sendHour = Number(hours);
    const sendMinute = Number(minutes);
    if (today.getHours() < sendHour || (today.getHours() === sendHour && today.getMinutes() < sendMinute)) return;

    const daysBefore = Math.max(0, Number(settings?.birthdaySendDaysBefore || 0));
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysBefore);
    const targetMonthDay = `${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const churchName = settings?.churchName || 'Grace Church';
    const template =
      settings?.birthdayMessageTemplate ||
      "Happy Birthday {{name}}! May God's blessings overflow in your life today and always. - {{church_name}}";

    const birthdayMembers = membersData.filter((m: Member) => {
      const dob = new Date(m.dateOfBirth);
      const memberBirthday = `${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
      return memberBirthday === targetMonthDay;
    });

    if (birthdayMembers.length > 0) {
      const existingLogs = JSON.parse(localStorage.getItem('cms_sms_logs') || '[]');
      const dateKey = today.toISOString().slice(0, 10);
      const newLogs: SMSLog[] = birthdayMembers.map((m: Member) => ({
        id: `sms-birthday-${dateKey}-${m.id}`,
        recipientId: m.id,
        recipientName: m.fullName,
        recipientPhone: m.phoneNumber,
        message: template.replaceAll('{{name}}', m.fullName).replaceAll('{{church_name}}', churchName),
        type: 'birthday',
        status: Math.random() > 0.1 ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
        failureReason: Math.random() > 0.1 ? undefined : 'Network error',
        createdBy: 'System (Auto)',
        createdAt: new Date().toISOString(),
      }));

      const existingKeys = new Set(existingLogs.map((log: SMSLog) => `${log.type}-${log.recipientId}-${new Date(log.createdAt).toISOString().slice(0, 10)}`));
      const dedupedNewLogs = newLogs.filter((log) => !existingKeys.has(`${log.type}-${log.recipientId}-${dateKey}`));
      if (dedupedNewLogs.length === 0) return;

      const updated = [...existingLogs, ...dedupedNewLogs];
      localStorage.setItem('cms_sms_logs', JSON.stringify(updated));
      setSmsLogs(updated);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return smsLogs.filter((log) => {
      const searchable = [log.recipientName, log.recipientPhone, log.message].join(' ').toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      if (filterDate) {
        const sentDate = log.sentAt ? new Date(log.sentAt).toISOString().slice(0, 10) : '';
        if (sentDate !== filterDate) return false;
      }
      return true;
    });
  }, [smsLogs, searchQuery, filterStatus, filterDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterDate]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pageBg = theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-neutral-200';
  const textMain = theme === 'dark' ? 'text-slate-50' : 'text-neutral-900';
  const textMuted = theme === 'dark' ? 'text-slate-300' : 'text-neutral-600';
  const inputClass = theme === 'dark'
    ? 'w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500'
    : 'w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h1 className={`mb-0 text-xl sm:text-2xl font-bold ${textMain}`}>SMS Logs</h1>
            <p className={`text-sm sm:text-base ${textMuted}`}>Review delivery history and track failed messages</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/messaging')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Back to Bulk SMS
          </button>
        </div>
      </div>

      <div className={`rounded-xl border shadow-sm overflow-hidden ${pageBg}`}>
        <div className={`border-b p-4 sm:p-6 ${theme === 'dark' ? 'border-slate-800' : 'border-neutral-200'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by recipient"
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'sent' | 'failed' | 'pending')}
              className={inputClass}
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={inputClass}
            />
          </div>

        </div>

        <div className="p-4 sm:p-6">
          <div className="md:hidden space-y-3">
            {paginatedLogs.map((log) => (
              <div key={log.id} className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-neutral-900'} truncate`}>
                      {log.recipientName}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-neutral-500'}`}>{log.recipientPhone}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs capitalize ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {log.type.replace('_', ' ')}
                  </span>
                </div>

                <p className={`mt-3 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>{log.message}</p>

                <div className="mt-3 space-y-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                    log.status === 'sent'
                      ? 'bg-success-50 text-success-700'
                      : log.status === 'pending'
                      ? 'bg-warning-50 text-warning-700'
                      : 'bg-danger-50 text-danger-700'
                  }`}>
                    {log.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                    {log.status === 'pending' && <Clock className="w-3 h-3" />}
                    {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                    {log.status}
                  </span>
                  {log.status === 'failed' && log.failureReason && (
                    <div className="flex items-start gap-1 text-xs text-danger-600">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="break-words">{log.failureReason}</span>
                    </div>
                  )}
                </div>

                <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-neutral-500'}`}>
                  {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                </p>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className={`${theme === 'dark' ? 'bg-slate-950/80 border-b border-slate-800' : 'bg-neutral-50 border-b border-neutral-200'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>Recipient</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>Message</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>Type</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>Status</th>
                  <th className={`px-6 py-3 text-left text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>Sent At</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'divide-y divide-slate-800' : 'divide-y divide-neutral-200'}>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className={theme === 'dark' ? 'hover:bg-slate-900 transition-colors' : 'hover:bg-neutral-50 transition-colors'}>
                    <td className="px-6 py-4">
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-neutral-900'}`}>{log.recipientName}</p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-neutral-500'}`}>{log.recipientPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>{log.message}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs capitalize ${
                        theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                          log.status === 'sent'
                            ? 'bg-success-50 text-success-700'
                            : log.status === 'pending'
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-danger-50 text-danger-700'
                        }`}>
                          {log.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'pending' && <Clock className="w-3 h-3" />}
                          {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                        {log.status === 'failed' && log.failureReason && (
                          <div className="flex items-start gap-1 text-xs text-danger-600">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="break-words">{log.failureReason}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="py-12 text-center">
              <MessageSquare className={`mx-auto mb-4 h-12 w-12 ${theme === 'dark' ? 'text-slate-500' : 'text-neutral-300'}`} />
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-neutral-500'}>
                {searchQuery || filterStatus !== 'all' || filterDate ? 'No SMS logs match your filters' : 'No SMS logs found'}
              </p>
            </div>
          )}

          <Pagination
            totalItems={filteredLogs.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
