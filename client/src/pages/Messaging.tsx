import { useState, useEffect } from 'react';
import type { SMSLog, SMSTemplate, Member } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { addAuditLog } from '../utils/mockData';
import { fetchMembers, fetchSettings, sendSmsBroadcast } from '../api/backend';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Filter,
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Zap,
  FileText
} from 'lucide-react';

export function Messaging() {
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'send'>('logs');
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [filterType, setFilterType] = useState<'all' | 'program_reminder' | 'birthday' | 'manual' | 'announcement'>('all');
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    loadData().catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to load messaging data'));
  }, []);

  const loadData = async () => {
    const [memberData, settings] = await Promise.all([
      fetchMembers(),
      fetchSettings(),
    ]);
    setMembers(memberData);
    let configuredDepartments: string[] = [];

    if (settings?.departments && settings.departments.length > 0) {
      configuredDepartments = settings.departments;
    } else {
      const localDepartmentsRaw = localStorage.getItem('cms_departments');
      if (localDepartmentsRaw) {
        try {
          const localDepartments = JSON.parse(localDepartmentsRaw);
          if (Array.isArray(localDepartments)) {
            configuredDepartments = localDepartments.filter(Boolean);
          }
        } catch {
          configuredDepartments = [];
        }
      }
    }

    if (configuredDepartments.length > 0) {
      setDepartments(configuredDepartments);
    } else {
      setDepartments(Array.from(new Set(memberData.map((m) => m.department))).filter(Boolean));
    }

    setSmsLogs(JSON.parse(localStorage.getItem('cms_sms_logs') || '[]'));
    setTemplates(JSON.parse(localStorage.getItem('cms_sms_templates') || '[]'));

    // Simulate auto birthday check from live member data
    checkAndSendBirthdayMessages(memberData, settings || undefined);
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
    const [hours = "08", minutes = "00"] = String(settings?.birthdaySendTime || "08:00").split(":");
    const sendHour = Number(hours);
    const sendMinute = Number(minutes);
    if (today.getHours() < sendHour || (today.getHours() === sendHour && today.getMinutes() < sendMinute)) {
      return;
    }
    const daysBefore = Math.max(0, Number(settings?.birthdaySendDaysBefore || 0));
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysBefore);
    const targetMonthDay = `${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const churchName = settings?.churchName || "Grace Church";
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
        message: template.replaceAll("{{name}}", m.fullName).replaceAll("{{church_name}}", churchName),
        type: 'birthday' as const,
        status: Math.random() > 0.1 ? 'sent' : 'failed' as const,
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

  const filteredLogs = smsLogs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterType !== 'all' && log.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: smsLogs.length,
    sent: smsLogs.filter(l => l.status === 'sent').length,
    failed: smsLogs.filter(l => l.status === 'failed').length,
    pending: smsLogs.filter(l => l.status === 'pending').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">SMS Messaging & Communication</h1>
            <p className="text-neutral-600">Manage SMS notifications and message templates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 bg-white from-info-500 to-info-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1 text-gray-700">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Messages</p>
          </div>

          <div className="border border-gray-200 bg-white from-success-500 to-success-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1 text-gray-700">{stats.sent}</p>
            <p className="text-sm text-gray-500">Sent</p>
          </div>

          <div className="border border-gray-200 bg-white from-danger-500 to-danger-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1 text-gray-700">{stats.failed}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </div>

          <div className="border border-gray-200 bg-white from-warning-500 to-warning-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-3xl mb-1 text-gray-700">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'logs'
                  ? 'bg-gray-200 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              SMS Logs
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'templates'
                  ? 'bg-gray-200 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'send'
                  ? 'bg-gray-200 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Send Message
            </button>
          </div>
        </div>

        {activeTab === 'logs' && (
          <SMSLogsTab
            logs={filteredLogs}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            toast={toast}
            onUpdate={(updated) => {
              setTemplates(updated);
              localStorage.setItem('cms_sms_templates', JSON.stringify(updated));
            }}
          />
        )}

        {activeTab === 'send' && (
          <SendMessageTab
            members={members}
            departments={departments}
            templates={templates}
            toast={toast}
            onSend={(newLogs) => {
              const updated = [...smsLogs, ...newLogs];
              setSmsLogs(updated);
              localStorage.setItem('cms_sms_logs', JSON.stringify(updated));
              
              newLogs.forEach(log => {
                addAuditLog({
                  id: Date.now().toString() + Math.random(),
                  userId: user!.id,
                  userName: user!.name,
                  userRole: user!.role,
                  action: 'sms_sent',
                  resourceType: 'sms',
                  resourceId: log.id,
                  details: `Sent SMS to ${log.recipientName}`,
                  timestamp: new Date().toISOString(),
                });
              });

              setActiveTab('logs');
            }}
          />
        )}
      </div>
    </div>
  );
}

function SMSLogsTab({ 
  logs, 
  filterStatus, 
  setFilterStatus,
  filterType,
  setFilterType
}: { 
  logs: SMSLog[];
  filterStatus: 'all' | 'sent' | 'failed' | 'pending';
  setFilterStatus: (status: 'all' | 'sent' | 'failed' | 'pending') => void;
  filterType: 'all' | 'program_reminder' | 'birthday' | 'manual' | 'announcement';
  setFilterType: (type: 'all' | 'program_reminder' | 'birthday' | 'manual' | 'announcement') => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Types</option>
          <option value="program_reminder">Program Reminder</option>
          <option value="birthday">Birthday</option>
          <option value="manual">Manual</option>
          <option value="announcement">Announcement</option>
        </select>

        <div className="flex-1"></div>
        <p className="text-sm text-neutral-600">Showing {logs.length} messages</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm text-neutral-700">Recipient</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700">Message</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700">Type</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700">Status</th>
              <th className="text-left px-6 py-3 text-sm text-neutral-700">Sent At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-neutral-900">{log.recipientName}</p>
                    <p className="text-xs text-neutral-500">{log.recipientPhone}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-neutral-700 line-clamp-2">{log.message}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 capitalize">
                    {log.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
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
                      <span className="text-xs text-danger-600" title={log.failureReason}>
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-700">
                  {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">No SMS logs found</p>
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ 
  templates, 
  toast,
  onUpdate 
}: { 
  templates: SMSTemplate[]; 
  toast: { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void };
  onUpdate: (templates: SMSTemplate[]) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const { confirm } = useConfirm();

  const deleteTemplate = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Template",
      message: "Are you sure you want to delete this template?",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    onUpdate(templates.filter(t => t.id !== id));
    toast.success("Template deleted");
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-neutral-800">SMS Templates</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-neutral-50 rounded-lg p-6 border border-neutral-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-neutral-900">{template.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                    template.isActive 
                      ? 'bg-success-50 text-success-700'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 bg-info-50 text-info-700 text-xs rounded-full capitalize">
                  {template.type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-neutral-700 bg-white p-3 rounded border border-neutral-200 mb-3">
              {template.content}
            </p>

            {template.variables.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500">Variables:</span>
                {template.variables.map(variable => (
                  <span key={variable} className="inline-flex items-center px-2 py-0.5 bg-accent-50 text-accent-700 text-xs rounded">
                    {`{{${variable}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">No templates found</p>
        </div>
      )}

      {(showModal || editingTemplate) && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={(template) => {
            if (editingTemplate) {
              onUpdate(templates.map(t => t.id === template.id ? template : t));
            } else {
              onUpdate([...templates, { ...template, id: `template-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
            }
            setShowModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

function SendMessageTab({ 
  members, 
  departments,
  templates,
  toast,
  onSend 
}: { 
  members: Member[];
  departments: string[];
  templates: SMSTemplate[];
  toast: { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void };
  onSend: (logs: SMSLog[]) => void;
}) {
  const [audience, setAudience] = useState<'all' | 'department' | 'selected'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const getRecipients = () => {
    if (audience === 'all') return members;
    if (audience === 'department') return members.filter(m => m.department === selectedDepartment);
    return members.filter(m => selectedMembers.includes(m.id));
  };

  const handleSend = async () => {
    const recipients = getRecipients();
    
    if (recipients.length === 0) {
      toast.info('Please select at least one recipient');
      return;
    }

    if (!message.trim()) {
      toast.info('Please enter a message');
      return;
    }

    try {
      const result = await sendSmsBroadcast({
        message,
        recipients: recipients.map((member) => ({
          memberId: member.id,
          name: member.fullName,
          phone: member.phoneNumber,
        })),
      });

      const newLogs = result.logs as SMSLog[];
      onSend(newLogs);
      toast.success(`Successfully sent ${newLogs.length} messages`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to send SMS');
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
    }
  };

  const recipients = getRecipients();

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-info-50 border border-info-200 rounded-lg p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-info-800">
            <p className="font-semibold mb-1">Automatic SMS Notifications</p>
            <p>This system automatically sends birthday wishes and program reminders. Birthday messages are sent automatically on members' birthdays.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-700 mb-2">Use Template (Optional)</label>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              applyTemplate(e.target.value);
            }}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select a template --</option>
            {templates.filter(t => t.isActive).map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-700 mb-2">Select Audience *</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="audience"
                value="all"
                checked={audience === 'all'}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">All Members</p>
                <p className="text-xs text-neutral-500">{members.length} recipients</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="audience"
                value="department"
                checked={audience === 'department'}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">Specific Department</p>
                {audience === 'department' && (
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="mt-2 w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">-- Select department --</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
              <input
                type="radio"
                name="audience"
                value="selected"
                checked={audience === 'selected'}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">Selected Members</p>
                <p className="text-xs text-neutral-500">{selectedMembers.length} selected</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-700 mb-2">Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={5}
            placeholder="Type your message here..."
            maxLength={160}
          />
          <p className="text-xs text-neutral-500 mt-1">{message.length}/160 characters</p>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h4 className="text-sm text-neutral-700 mb-2">Summary</h4>
          <p className="text-sm text-neutral-900">
            Recipients: <span className="font-semibold text-primary-600">{recipients.length}</span>
          </p>
          <p className="text-sm text-neutral-900">
            Estimated Cost: <span className="font-semibold text-primary-600">GH₵ {(recipients.length * 0.05).toFixed(2)}</span>
          </p>
        </div>

        <button
          onClick={() => handleSend()}
          disabled={recipients.length === 0 || !message.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          Send to {recipients.length} Recipients
        </button>
      </div>
    </div>
  );
}

function TemplateModal({ 
  template, 
  onClose, 
  onSave 
}: { 
  template: SMSTemplate | null; 
  onClose: () => void; 
  onSave: (template: SMSTemplate) => void;
}) {
  const [formData, setFormData] = useState<Partial<SMSTemplate>>(
    template || {
      name: '',
      type: 'manual',
      content: '',
      variables: [],
      isActive: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updatedAt: new Date().toISOString() } as SMSTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">{template ? 'Edit Template' : 'Add Template'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-neutral-700 mb-2">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-700 mb-2">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="manual">Manual</option>
              <option value="program_reminder">Program Reminder</option>
              <option value="birthday">Birthday</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-700 mb-2">Message Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Use {{variable}} for dynamic content"
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              Available variables: name, church_name, program_name, date, time, location
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-neutral-700">
              Active Template
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all"
            >
              {template ? 'Update Template' : 'Add Template'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
