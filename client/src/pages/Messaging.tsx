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
    const refreshDepartments = () => {
      loadData().catch((e) => toast.error(e?.response?.data?.message || e?.message || 'Failed to load messaging data'));
    };

    window.addEventListener('storage', refreshDepartments);
    window.addEventListener('church-settings-updated', refreshDepartments);
    return () => {
      window.removeEventListener('storage', refreshDepartments);
      window.removeEventListener('church-settings-updated', refreshDepartments);
    };
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
    const departmentPool = new Set<string>();

    const addDepartments = (value: unknown) => {
      if (!Array.isArray(value)) return;
      value.forEach((entry) => {
        const dept = String(entry || '').trim();
        if (dept) departmentPool.add(dept);
      });
    };

    addDepartments(settings?.departments);

    const localDepartmentsRaw = localStorage.getItem('cms_departments');
    if (localDepartmentsRaw) {
      try {
        addDepartments(JSON.parse(localDepartmentsRaw));
      } catch {
        // Ignore malformed local cache and continue with server/member data.
      }
    }

    memberData.forEach((member) => {
      const memberDepartments = member.departments?.length ? member.departments : member.department ? [member.department] : [];
      memberDepartments.forEach((dept) => {
        const normalized = String(dept || '').trim();
        if (normalized) departmentPool.add(normalized);
      });
    });

    if (departmentPool.size === 0) {
      departmentPool.add('General');
    }

    setDepartments(Array.from(departmentPool).sort((a, b) => a.localeCompare(b)));

    const cachedBalanceRaw = localStorage.getItem('cms_sms_balance');
    const cachedBalance = cachedBalanceRaw ? JSON.parse(cachedBalanceRaw) : null;
    const balance = await fetchSmsBalance().catch(() => cachedBalance);
    setTemplates(JSON.parse(localStorage.getItem('cms_sms_templates') || '[]'));
    setSmsBalance(balance?.smsBalance ?? null);
    setMainBalance(balance?.mainBalance ?? null);
    setBalanceSource(balance?.apiKeySource ?? '');
    if (balance) {
      localStorage.setItem('cms_sms_balance', JSON.stringify(balance));
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
          theme={theme}
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
            if (refreshedBalance) {
              localStorage.setItem('cms_sms_balance', JSON.stringify(refreshedBalance));
            }
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
  theme,
  onSend,
  smsBalance,
  mainBalance,
  balanceSource,
}: { 
  members: Member[];
  departments: string[];
  templates: SMSTemplate[];
  toast: { success: (message: string) => void; error: (message: string) => void; info: (message: string) => void };
  theme: 'dark' | 'light';
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

  const [audience, setAudience] = useState<'all' | 'department' | 'members' | 'manual'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
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
        .filter((member) =>
          (member.departments?.length ? member.departments : member.department ? [member.department] : [])
            .some((dept) => dept === selectedDepartment)
        )
        .map((member) => ({
          memberId: member.id,
          name: member.fullName,
          phone: member.phoneNumber,
        }));
    }
    if (audience === 'members') {
      const selectedSet = new Set(selectedMemberIds);
      return members
        .filter((member) => selectedSet.has(member.id))
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
  const filteredMembers = members
    .filter((member) => {
      const query = memberSearch.trim().toLowerCase();
      if (!query) return true;
      const searchable = [
        member.fullName,
        member.phoneNumber,
        member.email,
        ...(member.departments || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const allFilteredMembersSelected =
    filteredMembers.length > 0 && filteredMembers.every((member) => selectedMemberIds.includes(member.id));

  const toggleAllFilteredMembers = (checked: boolean) => {
    const filteredIds = new Set(filteredMembers.map((member) => member.id));
    setSelectedMemberIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredMembers.map((member) => member.id)]));
      }
      return prev.filter((id) => !filteredIds.has(id));
    });
  };

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
                value="members"
                checked={audience === 'members'}
                onChange={(e) => setAudience(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-900">Specific Members</p>
                <p className="text-xs text-neutral-500">Search and select exact people</p>
                {audience === 'members' && (
                  <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-950 text-slate-200'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-800'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allFilteredMembersSelected}
                          onChange={(e) => toggleAllFilteredMembers(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={theme === 'dark' ? 'text-slate-200' : 'text-neutral-800'}>Select all filtered members</span>
                      </label>
                      {selectedMemberIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIds([])}
                          className={`text-xs font-medium ${theme === 'dark' ? 'text-primary-300 hover:text-primary-200' : 'text-primary-600 hover:text-primary-700'}`}
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members by name, phone, email, or department"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />

                    <div className="max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => {
                          const checked = selectedMemberIds.includes(member.id);
                          const deptLabel = (member.departments?.length ? member.departments : [member.department]).filter(Boolean).join(', ');
                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                setSelectedMemberIds((prev) =>
                                  prev.includes(member.id)
                                    ? prev.filter((id) => id !== member.id)
                                    : [...prev, member.id]
                                );
                              }}
                              className={`w-full flex items-start gap-3 px-3 py-2 text-left border-b border-neutral-100 last:border-b-0 transition-colors ${
                                checked ? 'bg-primary-50' : 'hover:bg-neutral-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                className="mt-1 w-4 h-4 text-primary-600"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-neutral-900 truncate">{member.fullName}</p>
                                <p className="text-xs text-neutral-500 truncate">
                                  {member.phoneNumber || 'No phone'}{member.email ? ` · ${member.email}` : ''}
                                </p>
                                {deptLabel ? <p className="text-xs text-neutral-400 truncate">{deptLabel}</p> : null}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-sm text-neutral-500">No members match your search</div>
                      )}
                    </div>

                    {selectedMemberIds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedMemberIds.map((id) => {
                          const member = members.find((item) => item.id === id);
                          if (!member) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700">
                              {member.fullName}
                              <button
                                type="button"
                                onClick={() => setSelectedMemberIds((prev) => prev.filter((item) => item !== id))}
                                className="text-primary-500 hover:text-primary-700"
                                aria-label={`Remove ${member.fullName}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
