import { useEffect, useState } from 'react';
import type { SMSLog, SMSTemplate, Member } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { addAuditLog } from '../utils/mockData';
import { fetchMembers, fetchSettings, fetchSmsBalance, sendSmsBroadcast } from '../api/backend';
import { Send, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function Messaging() {
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [smsBalance, setSmsBalance] = useState<string | number | null>(null);
  const [mainBalance, setMainBalance] = useState<string | number | null>(null);
  const [balanceSource, setBalanceSource] = useState<'configured' | 'fallback' | ''>('');
  const { user } = useAuth();
  const toast = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    loadData().catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to load messaging data'));
  }, []);

  useEffect(() => {
    const syncTemplates = () => setTemplates(JSON.parse(localStorage.getItem('cms_sms_templates') || '[]'));
    window.addEventListener('sms-templates-updated', syncTemplates);
    window.addEventListener('storage', syncTemplates);
    return () => {
      window.removeEventListener('sms-templates-updated', syncTemplates);
      window.removeEventListener('storage', syncTemplates);
    };
  }, []);

  const loadData = async () => {
    const [memberData, settings] = await Promise.all([fetchMembers(), fetchSettings()]);
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

    const balance = await fetchSmsBalance().catch(() => null);
    setTemplates(JSON.parse(localStorage.getItem('cms_sms_templates') || '[]'));
    setSmsBalance(balance?.smsBalance ?? null);
    setMainBalance(balance?.mainBalance ?? null);
    setBalanceSource(balance?.apiKeySource ?? '');

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
    }
  };

  const formatBalance = (value: string | number | null): string => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return String(value);
  };

  return (
    <div className="relative p-4 sm:p-6 max-w-7xl mx-auto">
      <div
        className={`absolute top-3 right-3 md:right-6 z-20 inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-lg sm:text-xl font-semibold ${
          theme === 'dark'
            ? 'bg-slate-900/90 border-slate-700 text-slate-100 shadow-lg shadow-slate-950/40'
            : 'bg-white border-slate-200 text-slate-800 shadow-lg shadow-slate-200/70'
        }`}
      >
        <span className="uppercase tracking-wide text-[10px] sm:text-xs opacity-70">SMS Balance</span>
        <span>{formatBalance(smsBalance)}</span>
      </div>

      <div className="mb-6 relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className={`${theme === 'dark' ? 'text-slate-50' : 'text-neutral-900'} mb-0 text-xl sm:text-2xl font-bold`}>SMS Messaging & Communication</h1>
            <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-neutral-600'} text-sm sm:text-base`}>Manage SMS notifications and message templates</p>
          </div>
        </div>

        <div className="h-10" />
      </div>

      <div className={`rounded-xl shadow-sm border ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-neutral-200'}`}>
        <SendMessageTab
          members={members}
          departments={departments}
          templates={templates}
          toast={toast}
          onSend={async (newLogs) => {
            const existingLogs: SMSLog[] = JSON.parse(localStorage.getItem('cms_sms_logs') || '[]');
            const updated = [...existingLogs, ...newLogs];
            localStorage.setItem('cms_sms_logs', JSON.stringify(updated));

            newLogs.forEach((log) => {
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

            const refreshedBalance = await fetchSmsBalance().catch(() => null);
            setSmsBalance(refreshedBalance?.smsBalance ?? null);
            setMainBalance(refreshedBalance?.mainBalance ?? null);
            setBalanceSource(refreshedBalance?.apiKeySource ?? '');
          }}
          smsBalance={smsBalance}
          mainBalance={mainBalance}
          balanceSource={balanceSource}
        />
      </div>
    </div>
  );
}

function SendMessageTab({ 
  members, 
  departments,
  templates,
  toast,
  onSend,
  smsBalance,
  mainBalance,
  balanceSource,
}: { 
  members: Member[];
  departments: string[];
  templates: SMSTemplate[];
  toast: { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void };
  onSend: (logs: SMSLog[]) => Promise<void> | void;
  smsBalance: string | number | null;
  mainBalance: string | number | null;
  balanceSource: 'configured' | 'fallback' | '';
}) {
  type Recipient = {
    memberId?: string;
    name: string;
    phone: string;
  };

  const [audience, setAudience] = useState<'all' | 'department' | 'manual'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [manualNumbers, setManualNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const parseManualRecipients = (): Recipient[] => {
    const rawValues = manualNumbers
      .split(/[\n,;\t ]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(rawValues));
    return unique.map((phone) => ({
      name: phone,
      phone,
    }));
  };

  const getRecipients = (): Recipient[] => {
    if (audience === 'manual') return parseManualRecipients();
    if (audience === 'all') {
      return members.map((member) => ({
        memberId: member.id,
        name: member.fullName,
        phone: member.phoneNumber,
      }));
    }
    if (audience === 'department') {
      return members
        .filter((member) => member.department === selectedDepartment)
        .map((member) => ({
          memberId: member.id,
          name: member.fullName,
          phone: member.phoneNumber,
        }));
    }
    return [];
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
      setIsSending(true);
      const result = await sendSmsBroadcast({
        message,
        recipients: recipients.map((recipient) => ({
          memberId: recipient.memberId,
          name: recipient.name,
          phone: recipient.phone,
        })),
      });

      const newLogs = result.logs as SMSLog[];
      await onSend(newLogs);
      toast.success(`Successfully sent ${newLogs.length} messages`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to send SMS');
    } finally {
      setIsSending(false);
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
    <div className="w-full p-4 sm:p-6">
      <div className="w-full space-y-6">
        <div className="bg-info-50 border border-info-200 rounded-lg p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-info-800">
              <p className="font-semibold mb-1">Automatic SMS Notifications</p>
              <p>This system automatically sends birthday wishes. Birthday messages are sent automatically on members' birthdays.</p>
              <p className="mt-2 text-xs text-info-700">
                Balance snapshot: SMS {smsBalance ?? "—"} | Main {mainBalance ?? "—"}
                {balanceSource ? ` | Source: ${balanceSource === 'configured' ? 'configured API key' : 'fallback API key'}` : ""}
              </p>
            </div>
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
                value="manual"
                checked={audience === 'manual'}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">Manual Numbers</p>
                <p className="text-xs text-neutral-500">Type numbers directly</p>
                {audience === 'manual' && (
                  <textarea
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                    rows={4}
                    placeholder="Enter numbers separated by comma, space, or new line (e.g. 233208597629)"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
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
          disabled={recipients.length === 0 || !message.trim() || isSending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
          {isSending ? "Sending..." : `Send to ${recipients.length} Recipients`}
        </button>
      </div>
    </div>
  );
}
