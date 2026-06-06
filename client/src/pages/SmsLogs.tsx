import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { SMSLog } from '../types';
import { Pagination } from '../components/Pagination';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchSmsLogs } from '../api/backend';
import { AlertTriangle, Clock, CheckCircle2, MessageSquare, Search, XCircle } from 'lucide-react';

export function SmsLogs() {
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending' | 'skipped'>('all');
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
    const backendLogs = await fetchSmsLogs();
    const localLogs: SMSLog[] = JSON.parse(localStorage.getItem('cms_sms_logs') || '[]');
    const mergedLogs = [...backendLogs];
    const existingIds = new Set(backendLogs.map((log) => log.id));
    localLogs.forEach((log) => {
      if (!existingIds.has(log.id)) mergedLogs.push(log);
    });
    setSmsLogs(mergedLogs);
  };

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return smsLogs.filter((log) => {
      const searchable = [log.recipientName, log.recipientPhone, log.message].join(' ').toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      if (filterDate) {
        const timestamp = log.sentAt || log.createdAt;
        const sentDate = timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '';
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

  const statusMeta = (status: SMSLog['status']) => {
    switch (status) {
      case 'sent':
        return {
          wrapper: 'bg-success-50 text-success-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Sent',
        };
      case 'pending':
        return {
          wrapper: 'bg-warning-50 text-warning-700',
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending',
        };
      case 'skipped':
        return {
          wrapper: 'bg-amber-50 text-amber-700',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'Skipped',
        };
      case 'failed':
      default:
        return {
          wrapper: 'bg-danger-50 text-danger-700',
          icon: <XCircle className="w-3 h-3" />,
          label: 'Failed',
        };
    }
  };

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
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'sent' | 'failed' | 'pending' | 'skipped')}
              className={inputClass}
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="skipped">Skipped</option>
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
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${statusMeta(log.status).wrapper}`}>
                    {statusMeta(log.status).icon}
                    {statusMeta(log.status).label}
                  </span>
                  {log.failureReason && log.status !== 'sent' && (
                    <div
                      className={`flex items-start gap-1 text-xs ${
                        log.status === 'skipped' ? 'text-amber-700' : 'text-danger-600'
                      }`}
                    >
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="break-words">{log.failureReason}</span>
                    </div>
                  )}
                </div>

                <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-neutral-500'}`}>
                  {new Date(log.sentAt || log.createdAt).toLocaleString()}
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
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${statusMeta(log.status).wrapper}`}>
                          {statusMeta(log.status).icon}
                          {statusMeta(log.status).label}
                        </span>
                        {log.failureReason && log.status !== 'sent' && (
                          <div
                            className={`flex items-start gap-1 text-xs ${
                              log.status === 'skipped' ? 'text-amber-700' : 'text-danger-600'
                            }`}
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="break-words">{log.failureReason}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-neutral-700'}`}>
                      {new Date(log.sentAt || log.createdAt).toLocaleString()}
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
