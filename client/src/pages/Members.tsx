import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import type { Member } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useToast } from "../contexts/ToastContext";
import { addAuditLog } from "../utils/mockData";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  UserCircle,
  Mail,
  Phone,
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { Pagination } from "../components/Pagination";
import { createMember as apiCreateMember, deleteMember as apiDeleteMember, fetchMembers, updateMember as apiUpdateMember } from "../api/backend";

const darkInitialGradients = [
  "dark:bg-gradient-to-br dark:from-sky-400 dark:to-blue-600",
  "dark:bg-gradient-to-br dark:from-cyan-400 dark:to-indigo-600",
  "dark:bg-gradient-to-br dark:from-blue-400 dark:to-violet-600",
  "dark:bg-gradient-to-br dark:from-indigo-400 dark:to-sky-700",
  "dark:bg-gradient-to-br dark:from-teal-400 dark:to-blue-700",
];

const getInitialGradientClass = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return darkInitialGradients[hash % darkInitialGradients.length];
};

const getMemberDepartments = (member: Partial<Pick<Member, "department" | "departments">>): string[] => {
  const list = member.departments?.length ? member.departments : member.department ? [member.department] : [];
  return Array.from(new Set(list.map((dept) => String(dept || "").trim()).filter(Boolean)));
};

const csvEscape = (value: unknown): string => {
  const text = String(value ?? "");
  if (/["\n,;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatDepartmentsForCsv = (member: Partial<Pick<Member, "department" | "departments">>): string => {
  return getMemberDepartments(member).join(";");
};

const parseCsvText = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      currentCell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

const TIME_ZONE = "Africa/Accra";

const getAccraDateParts = (date: Date = new Date()): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    year: Number(parts.year || new Date().getFullYear()),
    month: Number(parts.month || 1),
    day: Number(parts.day || 1),
  };
};

const formatBirthdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
};

const normalizeBirthdayDate = (value: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getNextBirthdayOccurrence = (birthDate: Date, reference: Date = new Date()): Date | null => {
  const current = getAccraDateParts(reference);
  const birth = getAccraDateParts(birthDate);
  if (!birth.month || !birth.day) return null;

  let year = current.year;
  const candidate = new Date(Date.UTC(year, birth.month - 1, birth.day));
  const today = new Date(Date.UTC(current.year, current.month - 1, current.day));
  if (candidate.getTime() < today.getTime()) {
    year += 1;
  }

  const nextBirthday = new Date(Date.UTC(year, birth.month - 1, birth.day));
  if (Number.isNaN(nextBirthday.getTime())) return null;
  return nextBirthday;
};

export function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [birthdaySummaryOpen, setBirthdaySummaryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const data = await fetchMembers();
      setMembers(data);
    };

    load().catch((e) => {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load members");
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter]);

  const filteredMembers = useMemo(() => {
    let filtered = [...members];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.fullName.toLowerCase().startsWith(query) ||
          m.email.toLowerCase().startsWith(query) ||
          m.phoneNumber.startsWith(searchQuery) ||
          getMemberDepartments(m).some((dept) => dept.toLowerCase().startsWith(query))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((m) => m.membershipStatus === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((m) => getMemberDepartments(m).includes(departmentFilter));
    }

    return filtered;
  }, [members, searchQuery, statusFilter, departmentFilter]);

  useEffect(() => {
    if (currentPage > Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage))) {
      setCurrentPage(1);
    }
  }, [currentPage, filteredMembers.length]);

  useEffect(() => {
    setSelectedMemberIds((prev) =>
      prev.filter((id) => filteredMembers.some((member) => member.id === id))
    );
  }, [filteredMembers]);

  const currentMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentMemberIds = currentMembers.map((member) => member.id);
  const allCurrentPageSelected =
    currentMembers.length > 0 && currentMemberIds.every((id) => selectedMemberIds.includes(id));
  const someCurrentPageSelected =
    currentMembers.some((member) => selectedMemberIds.includes(member.id)) && !allCurrentPageSelected;

  const departments = Array.from(new Set(members.flatMap((m) => getMemberDepartments(m))));
  const birthdaySummary = useMemo(() => {
    const now = new Date();
    const dueBirthdays = members
      .map((member) => {
        const birthDate = normalizeBirthdayDate(member.dateOfBirth);
        if (!birthDate) return null;
        const nextBirthday = getNextBirthdayOccurrence(birthDate, now);
        if (!nextBirthday) return null;

        const todayParts = getAccraDateParts(now);
        const todayUtc = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
        const diffDays = Math.round((nextBirthday.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0 || diffDays > 13) return null;

        return {
          id: member.id,
          name: member.fullName,
          email: member.email,
          phone: member.phoneNumber,
          department: getMemberDepartments(member).join(", ") || "General",
          birthday: formatBirthdayLabel(nextBirthday),
          dateOfBirth: member.dateOfBirth,
          window: diffDays < 7 ? "this" : "next",
          daysUntil: diffDays,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      department: string;
      birthday: string;
      dateOfBirth: string;
      window: "this" | "next";
      daysUntil: number;
    }>;

    const orderedBirthdays = dueBirthdays.sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
      return a.name.localeCompare(b.name);
    });

    return {
      total: orderedBirthdays.length,
      thisWeek: orderedBirthdays.filter((item) => item.window === "this"),
      nextWeek: orderedBirthdays.filter((item) => item.window === "next"),
    };
  }, [members]);

  const deleteMember = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Member",
      message: "Are you sure you want to delete this member?",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    apiDeleteMember(id)
      .then(() => setMembers((prev) => prev.filter((m) => m.id !== id)))
      .then(() => toast.success("Member deleted"))
      .catch((e) => toast.error(e?.response?.data?.message || e?.message || "Failed to delete member"));

    addAuditLog({
      id: Date.now().toString(),
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role,
      action: "member_deleted",
      resourceType: "member",
      resourceId: id,
      details: `Deleted member`,
      timestamp: new Date().toISOString(),
    });
  };

  const bulkDeleteMembers = async () => {
    if (selectedMemberIds.length === 0) return;

    const confirmed = await confirm({
      title: "Delete Members",
      message: `Are you sure you want to delete ${selectedMemberIds.length} selected member${selectedMemberIds.length === 1 ? "" : "s"}?`,
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    const idsToDelete = [...selectedMemberIds];
    try {
      await Promise.all(idsToDelete.map((id) => apiDeleteMember(id)));
      setMembers((prev) => prev.filter((member) => !idsToDelete.includes(member.id)));
      setSelectedMemberIds([]);
      toast.success(`Deleted ${idsToDelete.length} member${idsToDelete.length === 1 ? "" : "s"}`);

      idsToDelete.forEach((id) => {
        const deletedMember = members.find((member) => member.id === id);
        addAuditLog({
          id: Date.now().toString() + Math.random(),
          userId: user!.id,
          userName: user!.name,
          userRole: user!.role,
          action: "member_deleted",
          resourceType: "member",
          resourceId: id,
          details: deletedMember ? `Deleted member: ${deletedMember.fullName}` : "Deleted member",
          timestamp: new Date().toISOString(),
        });
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete selected members");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Departments",
      "Status",
      "Join Date",
      "Date of Birth",
      "Gender",
      "Marital Status",
      "Address",
    ];
    const rows = members.map((m) => {
      const memberDepartments = getMemberDepartments(m);
      return [
        m.fullName,
        m.email,
        m.phoneNumber,
        memberDepartments[0] || "",
        formatDepartmentsForCsv(m),
        m.membershipStatus,
        m.joinDate,
        m.dateOfBirth || "",
        m.gender || "",
        m.maritalStatus || "",
        m.address || "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const toggleCurrentPageSelection = () => {
    setSelectedMemberIds((prev) => {
      if (allCurrentPageSelected) {
        return prev.filter((id) => !currentMemberIds.includes(id));
      }
      return Array.from(new Set([...prev, ...currentMemberIds]));
    });
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-xl sm:text-2xl font-bold">
              Member Management
            </h1>
            <p className="text-neutral-600 text-sm sm:text-base">
              Manage church members and their information
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={exportToCSV}
              className="bg-white flex items-center gap-2 px-3 sm:px-4 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="bg-white flex items-center gap-2 px-3 sm:px-4 py-2 text-sm border border-neutral-200 text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Bulk Upload
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Member
            </button>
          </div>
        </div>

        {selectedMemberIds.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-primary-800">
              <span className="font-semibold">{selectedMemberIds.length}</span> member
              {selectedMemberIds.length === 1 ? "" : "s"} selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedMemberIds([])}
                className="rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={bulkDeleteMembers}
                className="rounded-lg bg-danger-600 px-3 py-2 text-sm font-semibold text-white hover:bg-danger-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-white px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {birthdaySummary.total} birthdays for this week and next week
                </p>
                <p className="text-xs text-neutral-500">
                  Showing birthdays due in the next 14 days.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBirthdaySummaryOpen(true)}
              className="self-start rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
            >
              View
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="md:hidden p-3 space-y-3">
          {currentMembers.length > 0 ? (
            currentMembers.map((member) => (
              <div key={member.id} className="rounded-xl border border-neutral-200 p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => toggleMemberSelection(member.id)}
                      className="mt-3 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Select ${member.fullName}`}
                    />
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center ${getInitialGradientClass(member.fullName)}`}
                      >
                        <span className="text-gray-700 dark:text-white text-sm font-semibold">
                          {member.fullName.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-neutral-900 truncate">{member.fullName}</p>
                        <p className="text-xs text-neutral-500 capitalize">{member.gender}</p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                      member.membershipStatus === "active"
                        ? "bg-success-50 text-success-700"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {member.membershipStatus}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-neutral-600">
                  <p className="truncate">{member.email}</p>
                  <p>{member.phoneNumber}</p>
                  <p>{getMemberDepartments(member).join(", ") || "General"}</p>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/members/${member.id}`)}
                    className="p-2 text-info-600 hover:bg-info-50 rounded-lg transition-colors"
                    title="View Profile"
                  >
                    <UserCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center">
              <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-700 font-medium">
                {searchQuery ? "No members match your search" : "No members found"}
              </p>
              <p className="text-xs text-neutral-500">
                {searchQuery
                  ? "Try a different name, email, or phone number."
                  : "Add members to see them listed here."}
              </p>
            </div>
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm text-neutral-700 w-12">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    ref={(node) => {
                      if (node) node.indeterminate = someCurrentPageSelected;
                    }}
                    onChange={toggleCurrentPageSelection}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select current page members"
                  />
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Member
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3 text-sm text-neutral-700">
                  Contact
                </th>
                <th className="hidden lg:table-cell text-left px-6 py-3 text-sm text-neutral-700">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">
                  Status
                </th>
                <th className="hidden md:table-cell text-left px-6 py-3 text-sm text-neutral-700">
                  Join Date
                </th>
                <th className="text-right px-6 py-3 text-sm text-neutral-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {currentMembers.length > 0 ? (
                currentMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-4 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`Select ${member.fullName}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center ${getInitialGradientClass(member.fullName)}`}
                        >
                          <span className="text-gray-700 dark:text-white text-sm font-semibold">
                            {member.fullName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-900">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-neutral-500 capitalize">
                            {member.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Mail className="w-4 h-4 text-neutral-400" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-700">
                          <Phone className="w-4 h-4 text-neutral-400" />
                          {member.phoneNumber}
                        </div>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      {(() => {
                        const memberDepartments = getMemberDepartments(member);
                        const primaryDepartment = memberDepartments[0] || "General";
                        const extraDepartments = memberDepartments.slice(1);

                        return (
                          <div className="group relative inline-flex max-w-full">
                            <span className="max-w-[220px] truncate text-sm text-neutral-700 dark:text-slate-200">
                              {primaryDepartment}
                            </span>
                            {extraDepartments.length > 0 && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-slate-800 dark:text-slate-200">
                                +{extraDepartments.length}
                              </span>
                            )}
                            {extraDepartments.length > 0 && (
                              <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden min-w-56 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 shadow-xl group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                <p className="mb-1 font-semibold text-neutral-900 dark:text-slate-100">Departments</p>
                                <p className="leading-5">{memberDepartments.join(", ")}</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                          member.membershipStatus === "active"
                            ? "bg-success-50 text-success-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {member.membershipStatus}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <span className="text-sm text-neutral-700">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="p-2 text-info-600 hover:bg-info-50 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <UserCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingMember(member)}
                          className="p-2 text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-neutral-300" />
                      <p className="text-sm text-neutral-700 font-medium">
                        {searchQuery ? "No members match your search" : "No members found"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {searchQuery
                          ? "Try a different name, email, or phone number."
                          : "Add members to see them listed here."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          totalItems={filteredMembers.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={Math.ceil(filteredMembers.length / itemsPerPage)}
          onPageChange={setCurrentPage}
        />
      </div>

      {(showAddModal || editingMember) && (
      <MemberModal
          member={editingMember}
          existingMembers={members}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
          onSave={async (member) => {
            try {
              if (editingMember) {
                const saved = await apiUpdateMember(editingMember.id, member);
                setMembers((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
                toast.success("Member updated");
                addAuditLog({
                  id: Date.now().toString(),
                  userId: user!.id,
                  userName: user!.name,
                  userRole: user!.role,
                  action: "member_updated",
                  resourceType: "member",
                  resourceId: saved.id,
                  details: `Updated member: ${saved.fullName}`,
                  timestamp: new Date().toISOString(),
                });
              } else {
                const saved = await apiCreateMember(member);
                setMembers((prev) => [saved, ...prev]);
                toast.success("Member created");
                addAuditLog({
                  id: Date.now().toString(),
                  userId: user!.id,
                  userName: user!.name,
                  userRole: user!.role,
                  action: "member_created",
                  resourceType: "member",
                  resourceId: saved.id,
                  details: `Created new member: ${saved.fullName}`,
                  timestamp: new Date().toISOString(),
                });
              }

              setShowAddModal(false);
              setEditingMember(null);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || e?.message || "Failed to save member");
            }
          }}
        />
      )}

      {birthdaySummaryOpen && (
        <BirthdaySummaryModal
          thisWeek={birthdaySummary.thisWeek}
          nextWeek={birthdaySummary.nextWeek}
          onClose={() => setBirthdaySummaryOpen(false)}
        />
      )}

      {showBulkUploadModal && (
        <BulkUploadModal
          existingMembers={members}
          onClose={() => setShowBulkUploadModal(false)}
          onImport={async (newMembers) => {
            try {
              const saved = await Promise.all(newMembers.map((m) => apiCreateMember(m)));
              setMembers((prev) => [...saved, ...prev]);
              setShowBulkUploadModal(false);
              toast.success(`Imported ${saved.length} members`);

              addAuditLog({
                id: Date.now().toString(),
                userId: user!.id,
                userName: user!.name,
                userRole: user!.role,
                action: "member_created",
                resourceType: "member",
                details: `Bulk imported ${saved.length} members`,
                timestamp: new Date().toISOString(),
              });
            } catch (e: any) {
              toast.error(e?.response?.data?.message || e?.message || "Bulk import failed");
            }
          }}
        />
      )}
    </div>
  );
}

function BirthdaySummaryModal({
  thisWeek,
  nextWeek,
  onClose,
}: {
  thisWeek: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    birthday: string;
    dateOfBirth: string;
    window: "this" | "next";
    daysUntil: number;
  }>;
  nextWeek: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    birthday: string;
    dateOfBirth: string;
    window: "this" | "next";
    daysUntil: number;
  }>;
  onClose: () => void;
}) {
  const total = thisWeek.length + nextWeek.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Birthday Summary</h3>
            <p className="text-sm text-neutral-500">
              {total} birthday{total === 1 ? "" : "s"} due in the next 14 days
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <BirthdaySummarySection title={`This week (${thisWeek.length})`} items={thisWeek} />
          <BirthdaySummarySection title={`Next week (${nextWeek.length})`} items={nextWeek} />
        </div>
      </div>
    </div>
  );
}

function BirthdaySummarySection({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    birthday: string;
    dateOfBirth: string;
    window: "this" | "next";
    daysUntil: number;
  }>;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold text-neutral-900">{title}</h4>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900">{item.name}</p>
                  <p className="text-sm text-neutral-500">{item.department}</p>
                  <div className="mt-2 space-y-1 text-sm text-neutral-700">
                    <p className="truncate">Email: {item.email || "N/A"}</p>
                    <p>Phone: {item.phone || "N/A"}</p>
                    <p>Birthday: {item.birthday}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700">
                  {item.daysUntil === 0 ? "Today" : `${item.daysUntil} day${item.daysUntil === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-6 text-center">
          <p className="text-sm font-medium text-neutral-700">No birthdays in this period.</p>
        </div>
      )}
    </div>
  );
}

export function MemberModal({
  member,
  existingMembers,
  onClose,
  onSave,
}: {
  member: Member | null;
  existingMembers: Member[];
  onClose: () => void;
  onSave: (member: Member) => void;
}) {
  const toast = useToast();
  const [departments, setDepartments] = useState<string[]>([]);
  const initialDepartments = member?.departments?.length
    ? member.departments
    : member?.department
      ? [member.department]
      : [];
  const [formData, setFormData] = useState<Partial<Member>>(
    member || {
      fullName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      gender: "male",
      maritalStatus: "single",
      department: "",
      departments: [],
      membershipStatus: "active",
      joinDate: new Date().toISOString().split("T")[0],
      address: "",
    }
  );

  useEffect(() => {
    // Load departments from localStorage
    const storedDepts = localStorage.getItem("cms_departments");
    const depts = storedDepts
      ? JSON.parse(storedDepts)
      : ["Choir", "Ushering", "Media", "Prayer", "Youth", "Children"];
    setDepartments(depts);

    // Set default department if creating a new member
    if (!member && initialDepartments.length === 0 && depts.length > 0) {
      setFormData((prev) => ({ ...prev, department: depts[0], departments: [depts[0]] }));
    }
  }, []);

  const selectedDepartments = Array.from(
    new Set(
      (formData.departments?.length ? formData.departments : formData.department ? [formData.department] : [])
        .map((dept) => String(dept || "").trim())
        .filter(Boolean)
    )
  );

  const normalizeEmail = (email: string): string => String(email || "").trim().toLowerCase();
  const normalizePhone = (phone: string): string => {
    const cleaned = String(phone || "").trim().replace(/\s+/g, "");
    if (!cleaned) return "";
    const digits = cleaned.replace(/[^\d+]/g, "");
    const withoutPlus = digits.startsWith("+") ? digits.slice(1) : digits;
    if (withoutPlus.startsWith("0")) return `233${withoutPlus.slice(1)}`;
    if (withoutPlus.startsWith("233")) return withoutPlus;
    return withoutPlus;
  };

  const hasDuplicate = () => {
    const currentEmail = normalizeEmail(String(formData.email || ""));
    const currentPhone = normalizePhone(String(formData.phoneNumber || ""));
    const currentId = member?.id;

    return existingMembers.find((item) => {
      if (item.id === currentId) return false;
      const sameEmail = currentEmail && normalizeEmail(item.email || "") === currentEmail;
      const samePhone = currentPhone && normalizePhone(item.phoneNumber || "") === currentPhone;
      return sameEmail || samePhone;
    });
  };

  const toggleDepartment = (dept: string) => {
    setFormData((prev) => {
      const current = Array.from(
        new Set(
          ((prev.departments?.length ? prev.departments : prev.department ? [prev.department] : []) || [])
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )
      );
      const next = current.includes(dept)
        ? current.filter((value) => value !== dept)
        : [...current, dept];
      return {
        ...prev,
        department: next[0] || "",
        departments: next,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duplicate = hasDuplicate();
    if (duplicate) {
      toast.error(
        `Duplicate member detected. ${duplicate.fullName} already uses the same ${normalizeEmail(String(formData.email || "")) === normalizeEmail(duplicate.email || "") ? "email" : "phone number"}.`
      );
      return;
    }
    onSave({
      ...formData,
      department: selectedDepartments[0] || "",
      departments: selectedDepartments,
      updatedAt: new Date().toISOString(),
    } as Member);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">
            {member ? "Edit Member" : "Add New Member"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Marital Status *
              </label>
              <select
                value={formData.maritalStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maritalStatus: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">
                Departments *
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Select one or more departments.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-neutral-200 p-3">
                {departments.map((dept) => {
                  const checked = selectedDepartments.includes(dept);
                  return (
                    <label
                      key={dept}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary-50 text-primary-900"
                          : "hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDepartment(dept)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium">{dept}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Membership Status *
              </label>
              <select
                value={formData.membershipStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    membershipStatus: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">
                Join Date *
              </label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) =>
                  setFormData({ ...formData, joinDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all"
            >
              {member ? "Update Member" : "Add Member"}
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

function BulkUploadModal({
  existingMembers,
  onClose,
  onImport,
}: {
  existingMembers: Member[];
  onClose: () => void;
  onImport: (newMembers: Member[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Member>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  const normalizePhone = (phone: string): string =>
    String(phone || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^\d+]/g, "");
  const normalizeEmail = (email: string): string => String(email || "").trim().toLowerCase();

  const downloadTemplate = () => {
    const headers = [
      "Full Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Gender",
      "Marital Status",
      "Department",
      "Status",
      "Join Date",
      "Address",
    ];
    const sampleData = [
      [
        "John Doe",
        "john.doe@example.com",
        "+233 24 123 4567",
        "1990-01-15",
        "male",
        "married",
        "Choir",
        "active",
        "2024-01-01",
        "123 Main St, Accra",
      ],
      [
        "Jane Smith",
        "jane.smith@example.com",
        "+233 24 765 4321",
        "1985-06-20",
        "female",
        "single",
        "Ushering",
        "active",
        "2024-01-15",
        "456 Oak Ave, Kumasi",
      ],
    ];

    const csv = [headers, ...sampleData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members-template.csv";
    a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    } else {
      setError("Please select a valid CSV file.");
      setFile(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsvText(text);

        if (rows.length < 2) {
          setError("CSV file must contain at least one data row.");
          return;
        }

        const headers = rows[0];
        const dataRows = rows
          .slice(1)
          .filter((row) => row.some((cell) => cell)); // Filter out empty rows

        // Validate headers
        const requiredHeaders = [
          "Full Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Gender",
          "Marital Status",
          "Department",
          "Status",
          "Join Date",
        ];
        const missingHeaders = requiredHeaders.filter(
          (h) => !headers.includes(h)
        );
        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(", ")}`);
          return;
        }

        const parsedMembers: Partial<Member>[] = dataRows.map((row) => {
          const departmentsColumn = headers.includes("Departments")
            ? row[headers.indexOf("Departments")] || ""
            : "";
          const parsedDepartments = String(departmentsColumn || "")
            .split(/[;|/]/)
            .map((item) => item.trim())
            .filter(Boolean);
          const primaryDepartment = row[headers.indexOf("Department")] || "";
          const finalDepartments = parsedDepartments.length > 0
            ? parsedDepartments
            : primaryDepartment
              ? [primaryDepartment]
              : [];

          const member: Partial<Member> = {
            fullName: row[headers.indexOf("Full Name")] || "",
            email: row[headers.indexOf("Email")] || "",
            phoneNumber: row[headers.indexOf("Phone")] || "",
            dateOfBirth: row[headers.indexOf("Date of Birth")] || "",
            gender: (row[headers.indexOf("Gender")] || "male") as any,
            maritalStatus: (row[headers.indexOf("Marital Status")] ||
              "single") as any,
            department: finalDepartments[0] || "",
            departments: finalDepartments,
            membershipStatus: (row[headers.indexOf("Status")] ||
              "active") as any,
            joinDate:
              row[headers.indexOf("Join Date")] ||
              new Date().toISOString().split("T")[0],
            address: row[headers.indexOf("Address")] || "",
          };

          return member;
        });

        const existingPhones = new Set(
          existingMembers
            .map((member) => normalizePhone(member.phoneNumber))
            .filter(Boolean)
        );
        const existingEmails = new Set(
          existingMembers
            .map((member) => normalizeEmail(member.email))
            .filter(Boolean)
        );
        const batchPhones = new Map<string, number>();
        const batchEmails = new Map<string, number>();
        const warnings = parsedMembers.flatMap((member, index) => {
          const phone = normalizePhone(String(member.phoneNumber || ""));
          const email = normalizeEmail(String(member.email || ""));
          const messages: string[] = [];
          if (phone) {
            const nextCount = (batchPhones.get(phone) || 0) + 1;
            batchPhones.set(phone, nextCount);
            if (nextCount > 1) {
              messages.push(`Row ${index + 2}: duplicate phone number in upload file (${phone}).`);
            }
            if (existingPhones.has(phone)) {
              messages.push(`Row ${index + 2}: phone number already exists in your member list (${phone}).`);
            }
          }
          if (email) {
            const nextEmailCount = (batchEmails.get(email) || 0) + 1;
            batchEmails.set(email, nextEmailCount);
            if (nextEmailCount > 1) {
              messages.push(`Row ${index + 2}: duplicate email in upload file (${email}).`);
            }
            if (existingEmails.has(email)) {
              messages.push(`Row ${index + 2}: email already exists in your member list (${email}).`);
            }
          }
          return messages;
        });

        setPreviewData(parsedMembers);
        setDuplicateWarnings(warnings);
        setShowPreview(true);
        setError(null);
      } catch (err) {
        setError("Error parsing CSV file. Please check the format.");
        setPreviewData([]);
        setDuplicateWarnings([]);
        setShowPreview(false);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (previewData.length === 0) return;

    if (duplicateWarnings.length > 0) {
      setError("Please resolve duplicate phone numbers or emails before importing.");
      return;
    }

    const newMembers: Member[] = previewData.map(
      (member, index) =>
        ({
          ...member,
          id: `member-${Date.now()}-${index}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Member)
    );

    onImport(newMembers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900 font-semibold">
            Bulk Upload Members
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
            <div className="bg-info-50 border border-info-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-info-600 shrink-0 mt-0.5" />
              <div className="text-sm text-info-800">
                <p className="font-semibold mb-2">How to upload members:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Download the CSV template below</li>
                  <li>Fill in your member data following the format</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review the preview and confirm import</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-primary-300 text-primary-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download CSV Template
          </button>

          {/* File Upload */}
          <div>
            <label className="block text-sm text-neutral-700 mb-2 font-medium">
              Upload CSV File *
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-50 file:text-primary-600 hover:file:bg-gray-100"
              />
            </div>
            {file && (
              <p className="text-sm text-neutral-600 mt-2">
                <CheckCircle className="w-4 h-4 inline-block mr-1 text-success-600" />
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-600 shrink-0 mt-0.5" />
                <div className="text-sm text-danger-800">
                  <p className="font-semibold mb-1">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {duplicateWarnings.length > 0 && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="text-sm text-warning-800">
                <p className="font-semibold mb-2">Duplicate data found</p>
                <p className="mb-2">
                  Some rows share a phone number with another row in this upload or with an existing member. Please review them before importing.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {duplicateWarnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && previewData.length > 0 && (
            <div>
              <h4 className="text-sm text-neutral-900 font-semibold mb-3">
                Preview ({previewData.length} members)
              </h4>
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <div className="md:hidden p-3 space-y-2">
                    {previewData.slice(0, 10).map((member, index) => (
                      <div key={index} className="rounded-lg border border-neutral-200 p-2.5">
                        <p className="text-sm text-neutral-900">{member.fullName}</p>
                        <p className="text-xs text-neutral-600">{member.email}</p>
                        <p className="text-xs text-neutral-600">{member.phoneNumber}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-neutral-600">
                            {getMemberDepartments(member).join(", ") || "General"}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                              member.membershipStatus === "active"
                                ? "bg-success-50 text-success-700"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {member.membershipStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <table className="hidden md:table w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Name
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Email
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Phone
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Department
                        </th>
                        <th className="text-left px-3 py-2 text-xs text-neutral-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {previewData.slice(0, 10).map((member, index) => (
                        <tr key={index} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 text-neutral-900">
                            {member.fullName}
                          </td>
                          <td className="px-3 py-2 text-neutral-700">
                            {member.email}
                          </td>
                          <td className="px-3 py-2 text-neutral-700">
                            {member.phoneNumber}
                          </td>
                      <td className="px-3 py-2 text-neutral-700">
                        {getMemberDepartments(member).join(", ") || "General"}
                      </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                member.membershipStatus === "active"
                                  ? "bg-success-50 text-success-700"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {member.membershipStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 10 && (
                  <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-600">
                    Showing 10 of {previewData.length} members
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleImport}
              disabled={!showPreview || previewData.length === 0}
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-3 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Import {previewData.length} Members
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-3 rounded-lg hover:bg-neutral-200 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
