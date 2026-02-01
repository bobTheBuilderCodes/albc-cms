import { useState, useEffect } from 'react';
import type { AuditLog } from '../types';
import { initializeMockData } from '../utils/mockData';
import { 
  FileText, 
  Search, 
  Filter,
  Download,
  Shield,
  User,
  Calendar
} from 'lucide-react';
import { Pagination } from '../components/Pagination';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    initializeMockData();
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, actionFilter, userFilter, dateFilter]);

  const loadLogs = () => {
    const data = JSON.parse(localStorage.getItem('cms_audit_logs') || '[]');
    setLogs(data.sort((a: AuditLog, b: AuditLog) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.userId === userFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
    }

    setFilteredLogs(filtered);
  };

  const uniqueUsers = Array.from(new Set(logs.map(l => JSON.stringify({ id: l.userId, name: l.userName }))))
    .map(str => JSON.parse(str));

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const exportLogs = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.userName,
      log.userRole,
      log.action,
      log.resourceType,
      log.details,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-success-50 text-success-700';
    if (action.includes('updated')) return 'bg-info-50 text-info-700';
    if (action.includes('deleted')) return 'bg-danger-50 text-danger-700';
    if (action.includes('login') || action.includes('logout')) return 'bg-warning-50 text-warning-700';
    return 'bg-neutral-100 text-neutral-700';
  };

  const indexOfLastLog = currentPage * itemsPerPage;
  const indexOfFirstLog = indexOfLastLog - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">Audit Trail</h1>
            <p className="text-neutral-600">Track all system activities and changes</p>
          </div>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border border-gray-200 bg-white from-primary-500 to-primary-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{logs.length}</p>
            <p className="text-sm text-gray-500">Total Activities</p>
          </div>

          <div className="border border-gray-200 bg-white from-info-500  to-info-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{uniqueUsers.length}</p>
            <p className="text-sm text-gray-500">Active Users</p>
          </div>

          <div className="border border-gray-200 bg-white from-accent-500 to-accent-600 rounded-xl p-6 text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1">{filteredLogs.length}</p>
            <p className="text-sm text-gray-500">Filtered Results</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">User</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Action</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Resource</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">{log.userName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-900">{log.userName}</p>
                        <p className="text-xs text-neutral-500 capitalize">{log.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700 capitalize">
                    {log.resourceType}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No audit logs found</p>
          </div>
        )}

        <Pagination
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredLogs.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}