import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Bot,
  Clock3,
  PencilLine,
  Plus,
  Repeat,
  Save,
  Search,
  Sparkles,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Pagination } from "../components/Pagination";
import { createAutomation, deleteAutomation, fetchAutomations, fetchSettings, updateAutomation } from "../api/backend";
import { useTheme } from "../contexts/ThemeContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useToast } from "../contexts/ToastContext";
import type { Automation, AutomationAudienceType, AutomationConditionType, SMSTemplate } from "../types";

const AUTOMATIONS_KEY = "cms_automations";
const TEMPLATES_KEY = "cms_sms_templates";

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_ZONE = "Africa/Accra";
const RUN_GRACE_MINUTES = 10;
const monthDays = Array.from({ length: 31 }, (_, index) => index + 1);

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T;
    }
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const loadTemplates = (): SMSTemplate[] => readJson<SMSTemplate[]>(TEMPLATES_KEY, []);
const loadLegacyAutomations = (): Automation[] => readJson<Automation[]>(AUTOMATIONS_KEY, []);
const saveLegacyAutomations = (items: Automation[]) => localStorage.setItem(AUTOMATIONS_KEY, JSON.stringify(items));

const describeCondition = (automation: Automation): string => {
  if (automation.conditionType === "weekly") {
    const days = Array.isArray(automation.dayOfWeek) ? automation.dayOfWeek : automation.dayOfWeek ? [automation.dayOfWeek] : ["Sunday"];
    return `Every week on ${days.join(", ")} at ${automation.sendTime || "--:--"}`;
  }
  if (automation.conditionType === "monthly") {
    return `Every month on day ${automation.dayOfMonth || 1} at ${automation.sendTime || "--:--"}`;
  }
  return automation.customRule
    ? `${automation.customRule}${automation.sendTime ? ` at ${automation.sendTime}` : ""}`
    : "Custom schedule";
};

const conditionTone = (active: boolean, isDark: boolean) =>
  active
    ? isDark
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-success-50 text-success-700"
    : isDark
      ? "bg-slate-800 text-slate-300"
      : "bg-neutral-100 text-neutral-700";

const getZonedParts = (date: Date): Record<string, string> => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
};

const parseTime = (value?: string): { hour: number; minute: number } => {
  const match = String(value || "").match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 8, minute: 0 };
  return { hour: Number(match[1]), minute: Number(match[2]) };
};

const buildDateAtTime = (baseDate: Date, hour: number, minute: number): Date => {
  const date = new Date(baseDate);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
};

const getNextWeeklyRunAt = (automation: Automation): Date | null => {
  const days = Array.isArray(automation.dayOfWeek) ? automation.dayOfWeek : [];
  if (days.length === 0) return null;
  const { hour, minute } = parseTime(automation.sendTime || "08:00");
  const now = new Date();

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const zoned = getZonedParts(candidate);
    const weekday = zoned.weekday || weekDays[candidate.getUTCDay()];
    if (!days.includes(weekday)) continue;

    const scheduled = buildDateAtTime(candidate, hour, minute);
    const ageMinutes = (now.getTime() - scheduled.getTime()) / 60000;
    if (scheduled.getTime() <= now.getTime() && ageMinutes > RUN_GRACE_MINUTES) continue;
    return scheduled;
  }

  return null;
};

const getNextMonthlyRunAt = (automation: Automation): Date | null => {
  const dayOfMonth = Number(automation.dayOfMonth || 1);
  const { hour, minute } = parseTime(automation.sendTime || "08:00");
  const now = new Date();

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1, hour, minute, 0, 0));
    const target = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), dayOfMonth, hour, minute, 0, 0));
    if (target.getUTCMonth() !== candidate.getUTCMonth()) continue;
    const ageMinutes = (now.getTime() - target.getTime()) / 60000;
    if (target.getTime() <= now.getTime() && ageMinutes > RUN_GRACE_MINUTES) continue;
    return target;
  }

  return null;
};

const getNextCustomRunAt = (automation: Automation): Date | null => {
  const rule = String(automation.customRule || "").trim().toLowerCase();
  if (!rule) return null;
  const now = new Date();

  if (rule.includes("daily") || rule.includes("every day")) {
    const { hour, minute } = parseTime(automation.sendTime || "08:00");
    const today = buildDateAtTime(now, hour, minute);
    const ageMinutes = (now.getTime() - today.getTime()) / 60000;
    if (today.getTime() > now.getTime() || ageMinutes <= RUN_GRACE_MINUTES) return today;
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow;
  }

  const minuteInterval = rule.match(/every\s+(\d+)\s+minutes?/i);
  if (minuteInterval) {
    const interval = Math.max(1, Number(minuteInterval[1]));
    const next = new Date(now);
    next.setUTCSeconds(0, 0);
    const remainder = next.getUTCMinutes() % interval;
    const currentSlot = new Date(next);
    currentSlot.setUTCMinutes(next.getUTCMinutes() - remainder);
    const ageMinutes = (now.getTime() - currentSlot.getTime()) / 60000;
    if (currentSlot.getTime() <= now.getTime() && ageMinutes <= RUN_GRACE_MINUTES) {
      return currentSlot;
    }
    const future = new Date(currentSlot);
    future.setUTCMinutes(currentSlot.getUTCMinutes() + interval);
    return future;
  }

  const weekly = rule.match(/every\s+(\d+)\s+weeks?\s+on\s+(.+)/i);
  if (weekly) {
    const days = weekly[2]
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
    return getNextWeeklyRunAt({ ...automation, dayOfWeek: days });
  }

  const monthly = rule.match(/every\s+(\d+)\s+months?\s+on\s+day\s+(\d+)/i);
  if (monthly) {
    return getNextMonthlyRunAt({ ...automation, dayOfMonth: Number(monthly[2]) });
  }

  return null;
};

const getNextRunAt = (automation: Automation): Date | null => {
  if (automation.conditionType === "weekly") return getNextWeeklyRunAt(automation);
  if (automation.conditionType === "monthly") return getNextMonthlyRunAt(automation);
  if (automation.conditionType === "custom") return getNextCustomRunAt(automation);
  return null;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Not run yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not run yet";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function Automation() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [conditionFilter, setConditionFilter] = useState<"all" | AutomationConditionType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadData = async () => {
      try {
        const backendAutomations = await fetchAutomations();
        if (backendAutomations.length > 0) {
          setAutomations(backendAutomations);
          saveLegacyAutomations(backendAutomations);
          return;
        }

        const legacyAutomations = loadLegacyAutomations();
        if (legacyAutomations.length === 0) {
          setAutomations([]);
          return;
        }

        const templates = loadTemplates();
        const templateLookup = new Map(templates.map((template) => [template.id, template]));

        for (const automation of legacyAutomations) {
          const selectedTemplate = templateLookup.get(automation.templateId);
          await createAutomation({
            ...automation,
            templateContent: automation.templateContent || selectedTemplate?.content || "",
          });
        }

        const refreshed = await fetchAutomations();
        setAutomations(refreshed);
        saveLegacyAutomations(refreshed);
      } catch {
        setAutomations(loadLegacyAutomations());
      }
    };

    loadData().catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return automations.filter((automation) => {
      const searchable = [
        automation.name,
        automation.templateName,
        automation.description || "",
        automation.audienceType || "",
        automation.audienceDepartment || "",
        automation.manualNumbers || "",
        describeCondition(automation),
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (statusFilter === "active" && !automation.isActive) return false;
      if (statusFilter === "inactive" && automation.isActive) return false;
      if (conditionFilter !== "all" && automation.conditionType !== conditionFilter) return false;
      return true;
    });
  }, [automations, searchQuery, statusFilter, conditionFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, conditionFilter]);

  const currentAutomations = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleActive = (automationId: string) => {
    const current = automations.find((item) => item.id === automationId);
    if (!current) return;
    const next = { ...current, isActive: !current.isActive, updatedAt: new Date().toISOString() };
    updateAutomation(automationId, next)
      .then((updated) => {
        const items = automations.map((item) => (item.id === automationId ? updated : item));
        setAutomations(items);
        toast.success("Automation updated");
      })
      .catch((error) => toast.error(error?.response?.data?.message || error?.message || "Failed to update automation"));
  };

  const handleDelete = async (automationId: string) => {
    const current = automations.find((item) => item.id === automationId);
    if (!current) return;

    const confirmed = await confirm({
      title: "Delete Automation",
      message: `Delete "${current.name}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
    });

    if (!confirmed) return;

    deleteAutomation(automationId)
      .then(() => {
        setAutomations((items) => items.filter((item) => item.id !== automationId));
        toast.success("Automation deleted");
      })
      .catch((error) => toast.error(error?.response?.data?.message || error?.message || "Failed to delete automation"));
  };

  const pageTextClass = isDark ? "text-slate-50" : "text-neutral-900";
  const pageMutedClass = isDark ? "text-slate-300" : "text-neutral-600";
  const inputClass = isDark
    ? "w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
    : "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const selectClass = inputClass;
  const cardClass = isDark ? "bg-slate-950 border-slate-800" : "bg-white border-neutral-200";
  const tableHeadClass = isDark ? "bg-slate-950/80 border-slate-800" : "bg-neutral-50 border-neutral-200";
  const tableTextClass = isDark ? "text-slate-300" : "text-neutral-700";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${pageTextClass}`}>Automation</h1>
            <p className={`text-sm ${pageMutedClass}`}>
              Automate SMS notifications using your saved templates
            </p>
          </div>
          <button
            onClick={() => navigate("/automation/new")}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm bg-blue-900 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className={`md:col-span-2 relative ${isDark ? "bg-slate-900/80" : "bg-white"}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search automations..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className={selectClass}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value as "all" | AutomationConditionType)}
            className={selectClass}
          >
            <option value="all">All Conditions</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

        <div className={`rounded-xl shadow-sm border overflow-hidden ${cardClass}`}>
        <div className="md:hidden p-3 space-y-3">
          {currentAutomations.length > 0 ? (
            currentAutomations.map((automation) => (
              <div key={automation.id} className={`rounded-xl border p-3 ${isDark ? "border-slate-800 bg-slate-950" : "border-neutral-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm text-neutral-900 dark:text-slate-50 truncate font-semibold">{automation.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${conditionTone(automation.isActive, isDark)}`}>
                          {automation.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400 truncate">
                      Template: {automation.templateName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/automation/${automation.id}/edit`)}
                      className={`rounded-full p-1.5 transition-colors ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-neutral-600 hover:bg-neutral-100"}`}
                      title="Edit automation"
                    >
                      <PencilLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className={`rounded-full p-1.5 transition-colors ${isDark ? "text-rose-300 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50"}`}
                      title="Delete automation"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(automation.id)}
                      className={`rounded-full p-1.5 transition-colors ${automation.isActive ? "text-success-600 hover:bg-success-50 dark:hover:bg-emerald-500/10" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800"}`}
                      title={automation.isActive ? "Deactivate" : "Activate"}
                    >
                      {automation.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-neutral-600 dark:text-slate-300">
                  <p>{describeCondition(automation)}</p>
                  <p className="line-clamp-2">{automation.description || "No description provided."}</p>
                  <p>
                    <span className="font-semibold">Last run:</span> {formatDateTime(automation.lastRunAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Next run:</span> {formatDateTime(getNextRunAt(automation)?.toISOString() || null)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyAutomationsState searchQuery={searchQuery} onAdd={() => navigate("/automation/new")} />
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className={tableHeadClass}>
              <tr className="border-b border-neutral-200 dark:border-slate-800">
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Name</th>
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Template</th>
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Condition</th>
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Last run</th>
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Next run</th>
                <th className={`px-6 py-3 text-left text-sm font-medium ${tableTextClass}`}>Status</th>
                <th className={`px-6 py-3 text-right text-sm font-medium ${tableTextClass}`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-slate-800">
              {currentAutomations.length > 0 ? (
                currentAutomations.map((automation) => (
                  <tr key={automation.id} className="hover:bg-neutral-50 dark:hover:bg-slate-900">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className={`font-semibold ${isDark ? "text-slate-50" : "text-neutral-900"}`}>{automation.name}</p>
                        <p className={`text-sm line-clamp-1 ${isDark ? "text-slate-400" : "text-neutral-500"}`}>
                          {automation.description || "No description provided."}
                        </p>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-200" : "text-neutral-700"}`}>{automation.templateName}</td>
                    <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-200" : "text-neutral-700"}`}>{describeCondition(automation)}</td>
                    <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-200" : "text-neutral-700"}`}>{formatDateTime(automation.lastRunAt)}</td>
                    <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-200" : "text-neutral-700"}`}>{formatDateTime(getNextRunAt(automation)?.toISOString() || null)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${conditionTone(automation.isActive, isDark)}`}>
                        {automation.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/automation/${automation.id}/edit`)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <PencilLine className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(automation.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            isDark
                              ? "border-slate-700 bg-slate-950 text-rose-300 hover:bg-slate-900"
                              : "border-neutral-200 bg-white text-rose-600 hover:bg-neutral-50"
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                        <button
                          onClick={() => handleToggleActive(automation.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            isDark
                              ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
                              : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          {automation.isActive ? <ToggleRight className="w-4 h-4 text-success-600" /> : <ToggleLeft className="w-4 h-4" />}
                          {automation.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12">
                    <EmptyAutomationsState searchQuery={searchQuery} onAdd={() => navigate("/automation/new")} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filtered.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

function EmptyAutomationsState({
  searchQuery,
  onAdd,
}: {
  searchQuery: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="rounded-full bg-primary-50 p-4 text-primary-600 dark:bg-slate-800 dark:text-slate-200">
        <Bot className="w-8 h-8" />
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100">
          {searchQuery ? "No automations match your search" : "No automations added yet"}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
          {searchQuery
            ? "Try a different name, template, or description."
            : "Create your first automation to start sending SMS notifications automatically."}
        </p>
      </div>
      {!searchQuery && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      )}
    </div>
  );
}

export function AutomationNew() {
  const navigate = useNavigate();
  const { automationId } = useParams<{ automationId?: string }>();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isEditing = Boolean(automationId);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loadingAutomation, setLoadingAutomation] = useState(false);
  const [form, setForm] = useState({
    name: "",
    templateId: "",
    templateName: "",
    templateContent: "",
    conditionType: "weekly" as AutomationConditionType,
    audienceType: "all" as AutomationAudienceType,
    audienceDepartment: "",
    manualNumbers: "",
    dayOfWeek: ["Sunday"] as string[],
    dayOfMonth: 1,
    customRule: "",
    sendTime: "08:00",
    isActive: true,
  });

  useEffect(() => {
    const availableTemplates = loadTemplates().filter((template) => template.isActive !== false);
    setTemplates(availableTemplates);
    if (availableTemplates.length > 0) {
      setForm((prev) =>
        prev.templateId
          ? {
              ...prev,
              templateName:
                prev.templateName || availableTemplates.find((template) => template.id === prev.templateId)?.name || "",
              templateContent:
                prev.templateContent || availableTemplates.find((template) => template.id === prev.templateId)?.content || "",
            }
          : {
              ...prev,
              templateId: availableTemplates[0].id,
              templateName: availableTemplates[0].name,
              templateContent: availableTemplates[0].content,
            }
      );
    }
  }, []);

  useEffect(() => {
    const loadExistingAutomation = async () => {
      if (!automationId) return;
      setLoadingAutomation(true);
      try {
        const existing = (await fetchAutomations()).find((automation) => automation.id === automationId);
        if (!existing) {
          toast.error("Automation not found");
          navigate("/automation", { replace: true });
          return;
        }

        setForm({
          name: existing.name || "",
          templateId: existing.templateId || "",
          templateName: existing.templateName || "",
          templateContent: existing.templateContent || "",
          conditionType: existing.conditionType || "weekly",
          audienceType: existing.audienceType || "all",
          audienceDepartment: existing.audienceDepartment || "",
          manualNumbers: existing.manualNumbers || "",
          dayOfWeek: Array.isArray(existing.dayOfWeek) && existing.dayOfWeek.length > 0 ? existing.dayOfWeek : ["Sunday"],
          dayOfMonth: existing.dayOfMonth || 1,
          customRule: existing.customRule || "",
          sendTime: existing.sendTime || "08:00",
          isActive: existing.isActive !== false,
        });

        if (existing.templateId) {
          setTemplates((current) => {
            if (current.some((template) => template.id === existing.templateId)) return current;
            return [
              {
                id: existing.templateId,
                name: existing.templateName || "Saved template",
                type: "automation",
                content: existing.templateContent || "",
                variables: [],
                isActive: true,
                createdAt: existing.createdAt,
                updatedAt: existing.updatedAt,
              },
              ...current,
            ];
          });
        }
      } catch {
        toast.error("Failed to load automation");
        navigate("/automation", { replace: true });
      } finally {
        setLoadingAutomation(false);
      }
    };

    loadExistingAutomation().catch(() => undefined);
  }, [automationId, navigate, toast]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const settings = await fetchSettings();
        if (settings?.departments?.length) {
          setDepartments(settings.departments);
          return;
        }
      } catch {
        // fall through to local storage
      }

      const localDepartmentsRaw = localStorage.getItem("cms_departments");
      if (localDepartmentsRaw) {
        try {
          const localDepartments = JSON.parse(localDepartmentsRaw);
          if (Array.isArray(localDepartments)) {
            setDepartments(localDepartments.filter(Boolean));
          }
        } catch {
          setDepartments([]);
        }
      }
    };

    loadDepartments();
  }, []);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.templateId) {
      toast.error("Please select an SMS template");
      return;
    }

    if (form.audienceType === "department" && !form.audienceDepartment.trim()) {
      toast.error("Please select a department for this audience");
      return;
    }

    if (form.audienceType === "manual" && !form.manualNumbers.trim()) {
      toast.error("Please enter at least one manual number");
      return;
    }

    const selectedTemplate = templates.find((template) => template.id === form.templateId);
    const templateContent = selectedTemplate?.content || form.templateContent || "";
    const templateName = selectedTemplate?.name || form.templateName || "Saved template";
    if (!templateContent.trim()) {
      toast.error("Selected template is not available");
      return;
    }

    const scheduleLabel =
      form.conditionType === "weekly"
        ? `Every week on ${form.dayOfWeek.join(", ")} at ${form.sendTime}`
        : form.conditionType === "monthly"
        ? `Every month on day ${form.dayOfMonth} at ${form.sendTime}`
        : form.customRule.trim()
        ? `${form.customRule.trim()}${form.sendTime ? ` at ${form.sendTime}` : ""}`
        : `Custom schedule at ${form.sendTime}`;

    const payload: Omit<Automation, "id" | "createdAt" | "updatedAt"> = {
      name: form.name.trim(),
      templateId: form.templateId,
      templateName,
      templateContent,
      conditionType: form.conditionType,
      audienceType: form.audienceType,
      audienceDepartment: form.audienceType === "department" ? form.audienceDepartment.trim() : undefined,
      manualNumbers: form.audienceType === "manual" ? form.manualNumbers.trim() : undefined,
      scheduleLabel,
      dayOfWeek: form.conditionType === "weekly" ? form.dayOfWeek : undefined,
      dayOfMonth: form.conditionType === "monthly" ? form.dayOfMonth : undefined,
      customRule: form.conditionType === "custom" ? form.customRule.trim() : undefined,
      sendTime: form.sendTime,
      isActive: form.isActive,
    };

    const request = isEditing && automationId ? updateAutomation(automationId, payload) : createAutomation(payload);

    request
      .then(() => {
        toast.success(isEditing ? "Automation updated" : "Automation saved");
        navigate("/automation");
      })
      .catch((error) => toast.error(error?.response?.data?.message || error?.message || "Failed to save automation"));
  };

  const pageTitleClass = isDark ? "text-slate-50" : "text-neutral-900";
  const pageBodyClass = isDark ? "text-slate-300" : "text-neutral-600";
  const sectionTextClass = isDark ? "text-slate-200" : "text-neutral-700";
  const mutedTextClass = isDark ? "text-slate-400" : "text-neutral-500";
  const inputClass = isDark
    ? "w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
    : "w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const selectClass = inputClass;
  const helperClass = isDark ? "text-amber-300" : "text-amber-600";
  const backButtonClass = isDark
    ? "inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100"
    : "inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900";
  const outerCardClass = isDark
    ? "rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm"
    : "rounded-2xl border border-neutral-200 bg-white shadow-sm";
  const borderSectionClass = isDark ? "border-slate-800" : "border-neutral-200";
  const previewBoxClass = isDark
    ? "rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-4"
    : "rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4";
  const buttonSecondaryClass = isDark
    ? "rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900"
    : "rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/automation")}
        className={`mb-5 ${backButtonClass}`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Automations
      </button>

      <div className={outerCardClass}>
        <div className={`border-b ${borderSectionClass} px-4 py-4 sm:px-6`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${isDark ? "bg-slate-800 text-slate-200" : "bg-primary-50 text-primary-600"}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${pageTitleClass}`}>
                {isEditing ? "Edit Automation" : "Add New Automation"}
              </h1>
              <p className={`text-sm ${pageBodyClass}`}>
                Create a rule that sends SMS notifications automatically.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 p-4 sm:p-6">
          {loadingAutomation && (
            <div className={`rounded-xl border p-4 text-sm ${isDark ? "border-slate-800 bg-slate-950 text-slate-300" : "border-neutral-200 bg-neutral-50 text-neutral-600"}`}>
              Loading automation...
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={`mb-2 block text-sm font-semibold ${sectionTextClass}`}>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Sunday Birthday Reminder"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={`mb-2 block text-sm font-semibold ${sectionTextClass}`}>Select template</label>
              <select
                value={form.templateId}
                onChange={(e) => {
                  const template = templates.find((item) => item.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    templateId: e.target.value,
                    templateName: template?.name || prev.templateName,
                    templateContent: template?.content || prev.templateContent,
                  }));
                }}
                className={selectClass}
                required
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className={`mt-2 text-xs ${helperClass}`}>
                  No active SMS templates found. Create one in Messaging first.
                </p>
              )}
            </div>

            <div>
              <label className={`mb-2 block text-sm font-semibold ${sectionTextClass}`}>Condition</label>
              <select
                value={form.conditionType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, conditionType: e.target.value as AutomationConditionType }))
                }
                className={selectClass}
              >
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className={`rounded-xl border p-4 md:col-span-2 ${isDark ? "border-slate-800" : "border-neutral-200"}`}>
              <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${isDark ? "text-slate-100" : "text-neutral-800"}`}>
                <Repeat className="w-4 h-4" />
                Recurrence details
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {form.conditionType === "weekly" && (
                  <div className="md:col-span-2">
                    <label className={`mb-2 block text-sm ${sectionTextClass}`}>Days of week</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {weekDays.map((day) => {
                        const checked = form.dayOfWeek.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                dayOfWeek: checked
                                  ? prev.dayOfWeek.filter((item) => item !== day)
                                  : [...prev.dayOfWeek, day],
                              }))
                            }
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                              checked
                                ? isDark
                                  ? "border-indigo-500/70 bg-slate-950 text-slate-100"
                                  : "border-primary-300 bg-primary-50 text-neutral-900"
                                : isDark
                                  ? "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900"
                                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <p className={`mt-2 text-xs ${mutedTextClass}`}>Selected: {form.dayOfWeek.join(', ')}</p>
                  </div>
                )}

                {form.conditionType === "monthly" && (
                  <div>
                    <label className={`mb-2 block text-sm ${sectionTextClass}`}>Day of month</label>
                    <select
                      value={form.dayOfMonth}
                      onChange={(e) => setForm((prev) => ({ ...prev, dayOfMonth: Number(e.target.value) }))}
                      className={selectClass}
                    >
                      {monthDays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.conditionType === "custom" && (
                  <div className="md:col-span-2">
                    <label className={`mb-2 block text-sm ${sectionTextClass}`}>Custom rule</label>
                    <input
                      value={form.customRule}
                      onChange={(e) => setForm((prev) => ({ ...prev, customRule: e.target.value }))}
                      placeholder="e.g. Every 2 weeks on Monday"
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className={`mb-2 block text-sm ${sectionTextClass}`}>Send time</label>
                  <div className="relative">
                    <Clock3 className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedTextClass}`} />
                    <input
                      type="time"
                      value={form.sendTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, sendTime: e.target.value }))}
                      className={`${inputClass} pl-10`}
                      required
                    />
                  </div>
                </div>

              </div>
            </div>

            <div className="md:col-span-2">
              <label className={`mb-2 block text-sm font-semibold ${sectionTextClass}`}>Audience *</label>
              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  form.audienceType === "all"
                    ? isDark
                      ? "border-indigo-500/70 bg-slate-950"
                      : "border-primary-300 bg-primary-50"
                    : isDark
                      ? "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                      : "border-neutral-300 bg-white hover:bg-neutral-50"
                }`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="all"
                    checked={form.audienceType === "all"}
                    onChange={(e) => setForm((prev) => ({ ...prev, audienceType: e.target.value as AutomationAudienceType }))}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-neutral-900"}`}>All Members</p>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-neutral-500"}`}>Send this automation to every member.</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  form.audienceType === "department"
                    ? isDark
                      ? "border-indigo-500/70 bg-slate-950"
                      : "border-primary-300 bg-primary-50"
                    : isDark
                      ? "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                      : "border-neutral-300 bg-white hover:bg-neutral-50"
                }`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="department"
                    checked={form.audienceType === "department"}
                    onChange={(e) => setForm((prev) => ({ ...prev, audienceType: e.target.value as AutomationAudienceType }))}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-neutral-900"}`}>Specific Department</p>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-neutral-500"}`}>Send only to one configured department.</p>
                    {form.audienceType === "department" && (
                      <select
                        value={form.audienceDepartment}
                        onChange={(e) => setForm((prev) => ({ ...prev, audienceDepartment: e.target.value }))}
                        className={`mt-2 w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          isDark
                            ? "border-slate-700 bg-slate-950 text-slate-100"
                            : "border-neutral-300 bg-white text-neutral-900"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        required={form.audienceType === "department"}
                      >
                        <option value="">-- Select department --</option>
                        {departments.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  form.audienceType === "manual"
                    ? isDark
                      ? "border-indigo-500/70 bg-slate-950"
                      : "border-primary-300 bg-primary-50"
                    : isDark
                      ? "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                      : "border-neutral-300 bg-white hover:bg-neutral-50"
                }`}>
                  <input
                    type="radio"
                    name="audienceType"
                    value="manual"
                    checked={form.audienceType === "manual"}
                    onChange={(e) => setForm((prev) => ({ ...prev, audienceType: e.target.value as AutomationAudienceType }))}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-neutral-900"}`}>Manual Numbers</p>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-neutral-500"}`}>Type numbers directly.</p>
                    {form.audienceType === "manual" && (
                      <textarea
                        value={form.manualNumbers}
                        onChange={(e) => setForm((prev) => ({ ...prev, manualNumbers: e.target.value }))}
                        className={`mt-2 w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          isDark
                            ? "border-slate-700 bg-slate-950 text-slate-100"
                            : "border-neutral-300 bg-white text-neutral-900"
                        }`}
                        rows={4}
                        placeholder="Enter numbers separated by comma, space, or new line (e.g. 233208597629)"
                        onClick={(e) => e.stopPropagation()}
                        required={form.audienceType === "manual"}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

          </div>

          <div className={previewBoxClass}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${mutedTextClass}`}>Preview</p>
            <div className={`mt-2 flex flex-col gap-1 text-sm ${isDark ? "text-slate-200" : "text-neutral-700"}`}>
              <p>
                <span className={`font-semibold ${isDark ? "text-slate-50" : "text-neutral-900"}`}>Schedule:</span>{" "}
                {form.conditionType === "weekly"
                  ? `Every week on ${form.dayOfWeek.join(", ")} at ${form.sendTime}`
                  : form.conditionType === "monthly"
                  ? `Every month on day ${form.dayOfMonth} at ${form.sendTime}`
                  : form.customRule.trim()
                  ? `${form.customRule.trim()}${form.sendTime ? ` at ${form.sendTime}` : ""}`
                  : `Custom schedule at ${form.sendTime}`}
              </p>
              <p>
                <span className={`font-semibold ${isDark ? "text-slate-50" : "text-neutral-900"}`}>Active:</span>{" "}
                {form.isActive ? "Yes" : "No"}
              </p>
              <p>
                <span className={`font-semibold ${isDark ? "text-slate-50" : "text-neutral-900"}`}>Audience:</span>{" "}
                {form.audienceType === "all"
                  ? "All members"
                  : form.audienceType === "department"
                  ? `Department - ${form.audienceDepartment || "Select a department"}`
                  : form.manualNumbers.trim()
                  ? `${form.manualNumbers.split(/[\n,;\t ]+/).filter(Boolean).length} manual numbers`
                  : "Manual numbers"}
              </p>
            </div>
          </div>

          <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-end ${isDark ? "border-slate-800" : "border-neutral-200"}`}>
            <button
              type="button"
              onClick={() => navigate("/automation")}
              className={buttonSecondaryClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/20"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
