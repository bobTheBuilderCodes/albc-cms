import { useEffect, useMemo, useState } from "react";
import type { Attendance as AttendanceType, ChurchProgram, Member } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { addAuditLog } from "../utils/mockData";
import {
  fetchAttendance,
  fetchMembers,
  fetchPrograms,
  fetchSundayAttendanceByYear,
  fetchSundayAttendanceYears,
  markAttendance as apiMarkAttendance,
  markSundayAttendance as apiMarkSundayAttendance,
  type SundayEditWindow,
  type SundayAttendanceRecord,
} from "../api/backend";
import {
  Calendar,
  CheckCircle2,
  Download,
  Plus,
  Search,
  TrendingUp,
  UserCheck,
  XCircle,
} from "lucide-react";

type AttendanceMode = "program" | "sunday";

const currentYear = new Date().getFullYear();

export function Attendance() {
  const [mode, setMode] = useState<AttendanceMode>("program");
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [showMarkModal, setShowMarkModal] = useState(false);

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [sundayDates, setSundayDates] = useState<string[]>([]);
  const [selectedSunday, setSelectedSunday] = useState<string>("");
  const [sundaySearch, setSundaySearch] = useState("");
  const [sundayAttendance, setSundayAttendance] = useState<SundayAttendanceRecord[]>([]);
  const [sundayEditWindow, setSundayEditWindow] = useState<SundayEditWindow | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string>("");

  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      const [att, mem, pro, availableYears] = await Promise.all([
        fetchAttendance(),
        fetchMembers(),
        fetchPrograms(),
        fetchSundayAttendanceYears(),
      ]);

      setAttendance(att);
      setMembers(mem);
      setPrograms(pro);

      const normalizedYears = availableYears.length > 0 ? availableYears : [currentYear];
      setYears(normalizedYears);
      if (!normalizedYears.includes(currentYear)) {
        setSelectedYear(normalizedYears[0]);
      }
    };

    load().catch((e) => toast.error(e?.response?.data?.message || e?.message || "Failed to load attendance"));
  }, [toast]);

  useEffect(() => {
    const loadYear = async () => {
      const data = await fetchSundayAttendanceByYear(selectedYear);
      setSundayDates(data.sundayDates);
      setSundayAttendance(data.records);
      setSundayEditWindow(data.editWindow || null);
      setSelectedSunday((prev) => (prev && data.sundayDates.includes(prev) ? prev : data.sundayDates[0] || ""));
    };

    loadYear().catch((e) => toast.error(e?.response?.data?.message || e?.message || "Failed to load Sunday attendance"));
  }, [selectedYear, toast]);

  const programAttendance = useMemo(
    () => (selectedProgram ? attendance.filter((a) => a.programId === selectedProgram) : []),
    [attendance, selectedProgram]
  );

  const attendanceRate =
    programAttendance.length > 0
      ? (programAttendance.filter((a) => a.status === "present").length / programAttendance.length) * 100
      : 0;

  const overallAttendanceRate =
    attendance.length > 0 ? (attendance.filter((a) => a.status === "present").length / attendance.length) * 100 : 0;

  const sundayStatusByMember = useMemo(() => {
    const map = new Map<string, SundayAttendanceRecord>();
    for (const record of sundayAttendance) {
      if (record.sundayKey === selectedSunday) {
        map.set(record.memberId, record);
      }
    }
    return map;
  }, [selectedSunday, sundayAttendance]);

  const sundayFilteredMembers = useMemo(
    () => members.filter((m) => m.fullName.toLowerCase().includes(sundaySearch.toLowerCase())),
    [members, sundaySearch]
  );

  const sundayPresentCount = useMemo(() => {
    let count = 0;
    sundayFilteredMembers.forEach((member) => {
      const status = sundayStatusByMember.get(member.id)?.status ?? "present";
      if (status === "present") count += 1;
    });
    return count;
  }, [sundayFilteredMembers, sundayStatusByMember]);

  const sundayAbsentCount = sundayFilteredMembers.length - sundayPresentCount;
  const sundayRate = sundayFilteredMembers.length > 0 ? (sundayPresentCount / sundayFilteredMembers.length) * 100 : 0;
  const todayUtcKey = sundayEditWindow?.serverNowUtc
    ? new Date(sundayEditWindow.serverNowUtc).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const isFutureSunday = Boolean(selectedSunday) && selectedSunday > todayUtcKey;
  const canEditSelectedSunday =
    Boolean(selectedSunday) &&
    !isFutureSunday &&
    Boolean(sundayEditWindow?.canEditPreviousSunday) &&
    selectedSunday === sundayEditWindow?.previousSundayKey;
  const sundayEditHelpText = isFutureSunday
    ? "Future Sundays are read-only."
    : !canEditSelectedSunday
    ? `Editing is only allowed for the previous Sunday until ${sundayEditWindow?.submissionDeadlineUtc ? new Date(sundayEditWindow.submissionDeadlineUtc).toLocaleString() : "Wednesday 6:00 PM"}.`
    : `You can edit this Sunday until ${sundayEditWindow?.submissionDeadlineUtc ? new Date(sundayEditWindow.submissionDeadlineUtc).toLocaleString() : "Wednesday 6:00 PM"}.`;

  const exportAttendance = () => {
    const program = programs.find((p) => p.id === selectedProgram);
    const headers = ["Member Name", "Status", "Date"];
    const rows = programAttendance.map((a) => {
      const member = members.find((m) => m.id === a.memberId);
      return [member?.fullName || "Unknown", a.status, new Date(a.date).toLocaleDateString()];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${program?.name || "all"}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const toggleSundayStatus = async (memberId: string) => {
    if (!selectedSunday) return;
    if (!canEditSelectedSunday) {
      toast.info("This Sunday is locked for editing.");
      return;
    }
    try {
      setSavingMemberId(memberId);
      const current = sundayStatusByMember.get(memberId)?.status ?? "present";
      const nextStatus = current === "present" ? "absent" : "present";
      const updated = await apiMarkSundayAttendance({
        year: selectedYear,
        memberId,
        sundayKey: selectedSunday,
        status: nextStatus,
      });

      setSundayAttendance((prev) => {
        const index = prev.findIndex((r) => r.memberId === memberId && r.sundayKey === selectedSunday && r.year === selectedYear);
        if (index >= 0) {
          const clone = [...prev];
          clone[index] = updated;
          return clone;
        }
        return [...prev, updated];
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update Sunday attendance");
    } finally {
      setSavingMemberId("");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-0 text-2xl font-bold">Attendance Management</h1>
            <p className="text-neutral-600">Track attendance for programs and Sunday services</p>
          </div>
          {mode === "program" && (
            <button
              onClick={() => setShowMarkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Mark Program Attendance
            </button>
          )}
        </div>

      </div>

      {mode === "program" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-gray-200 p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <UserCheck className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-3xl mb-1">{attendance.length}</p>
              <p className="text-sm text-gray-500">Total Records</p>
            </div>

            <div className="border border-gray-200 p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-3xl mb-1">{attendance.filter((a) => a.status === "present").length}</p>
              <p className="text-sm text-gray-500">Present</p>
            </div>

            <div className="border border-gray-200 p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-3xl mb-1">{attendance.filter((a) => a.status === "absent").length}</p>
              <p className="text-sm text-gray-500">Absent</p>
            </div>

            <div className="border border-gray-200 p-6 text-gray-700 bg-white rounded-xl hover:bg-neutral-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-3xl mb-1">{overallAttendanceRate.toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Attendance Rate</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
            <div className="border-b border-neutral-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-lg transition-colors bg-gray-200 text-primary-700"
                  onClick={() => setMode("program")}
                >
                  Program Attendance
                </button>
                <button
                  className="px-4 py-2 rounded-lg transition-colors text-neutral-600 hover:bg-neutral-100"
                  onClick={() => setMode("sunday")}
                >
                  Sunday Services
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm text-neutral-700 mb-2">Select Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Select a program --</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} - {new Date(program.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProgram && (
                  <button
                    onClick={exportAttendance}
                    className="mt-6 flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                )}
              </div>

              {selectedProgram ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-neutral-800">
                      Attendance: {programAttendance.length} records ({attendanceRate.toFixed(0)}% present)
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm text-neutral-700">Member</th>
                          <th className="text-left px-6 py-3 text-sm text-neutral-700">Status</th>
                          <th className="text-left px-6 py-3 text-sm text-neutral-700">Date</th>
                          <th className="text-left px-6 py-3 text-sm text-neutral-700">Notes</th>
                          <th className="text-left px-6 py-3 text-sm text-neutral-700">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {programAttendance.map((att) => {
                          const member = members.find((m) => m.id === att.memberId);
                          return (
                            <tr key={att.id} className="hover:bg-neutral-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm">{member?.fullName.charAt(0) || "?"}</span>
                                  </div>
                                  <span className="text-sm text-neutral-900">{member?.fullName || "Unknown"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                                    att.status === "present" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"
                                  }`}
                                >
                                  {att.status === "present" && <CheckCircle2 className="w-3 h-3" />}
                                  {att.status === "absent" && <XCircle className="w-3 h-3" />}
                                  {att.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-neutral-700">{new Date(att.date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-sm text-neutral-600">{att.notes || "-"}</td>
                              <td className="px-6 py-4 text-sm text-neutral-600">{att.recordedBy}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">Select a program to view attendance records</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {mode === "sunday" && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="border-b border-neutral-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg transition-colors text-neutral-600 hover:bg-neutral-100"
                onClick={() => setMode("program")}
              >
                Program Attendance
              </button>
              <button
                className="px-4 py-2 rounded-lg transition-colors bg-gray-200 text-primary-700"
                onClick={() => setMode("sunday")}
              >
                Sunday Services
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Sunday</label>
              <select
                value={selectedSunday}
                onChange={(e) => setSelectedSunday(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {sundayDates.map((date) => (
                  <option key={date} value={date} disabled={date > todayUtcKey}>
                    {new Date(`${date}T00:00:00`).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mt-0">
              <label className="block text-sm text-neutral-700 mb-2">Search Member</label>
              <Search className="absolute left-3 top-[2.45rem] w-4 h-4 text-neutral-400" />
              <input
                value={sundaySearch}
                onChange={(e) => setSundaySearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="border border-gray-200 p-4 rounded-xl">
                <p className="text-2xl font-semibold">{sundayDates.length}</p>
                <p className="text-sm text-neutral-500">Sundays in {selectedYear}</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl">
                <p className="text-2xl font-semibold">{sundayFilteredMembers.length}</p>
                <p className="text-sm text-neutral-500">Members</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl">
                <p className="text-2xl font-semibold text-emerald-700">{sundayPresentCount}</p>
                <p className="text-sm text-neutral-500">Present</p>
              </div>
              <div className="border border-gray-200 p-4 rounded-xl">
                <p className="text-2xl font-semibold text-rose-700">{sundayAbsentCount}</p>
                <p className="text-sm text-neutral-500">Absent ({sundayRate.toFixed(0)}% attendance)</p>
              </div>
            </div>
            <div className="mb-4 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-xs text-neutral-600">{sundayEditHelpText}</p>
            </div>

            {selectedSunday ? (
              <div className="overflow-x-auto">
                {sundayFilteredMembers.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm text-neutral-700">Member</th>
                        <th className="text-left px-4 py-3 text-sm text-neutral-700">Department</th>
                        <th className="text-left px-4 py-3 text-sm text-neutral-700">Status</th>
                        <th className="text-left px-4 py-3 text-sm text-neutral-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {sundayFilteredMembers.map((member) => {
                        const status = sundayStatusByMember.get(member.id)?.status ?? "present";
                        const disabled = savingMemberId === member.id;
                        return (
                          <tr key={`${selectedSunday}-${member.id}`} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-neutral-900">{member.fullName}</td>
                            <td className="px-4 py-3 text-sm text-neutral-600">{member.department || "General"}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${
                                  status === "present" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {status === "present" ? "Present" : "Absent"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                            <button
                              disabled={disabled || !canEditSelectedSunday}
                              onClick={() => toggleSundayStatus(member.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs ${
                                disabled || !canEditSelectedSunday
                                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                  : status === "present"
                                  ? "bg-rose-600 text-white hover:bg-rose-700"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              } transition-colors`}
                            >
                              {disabled ? "Saving..." : !canEditSelectedSunday ? "Locked" : status === "present" ? "Mark Absent" : "Mark Present"}
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-600 font-medium">No members match your search</p>
                    <p className="text-sm text-neutral-500">Try a different name or clear the search term.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500">No Sundays found for this year.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showMarkModal && (
        <MarkAttendanceModal
          programs={programs}
          members={members}
          onClose={() => setShowMarkModal(false)}
          onSave={async (newAttendance) => {
            try {
              await Promise.all(
                newAttendance.map((att) =>
                  apiMarkAttendance({
                    programId: att.programId,
                    memberId: att.memberId,
                    status: att.status === "present" ? "present" : "absent",
                  })
                )
              );

              const refreshed = await fetchAttendance();
              setAttendance(refreshed);
              toast.success("Attendance recorded");

              if (user) {
                addAuditLog({
                  id: `${Date.now()}-${Math.random()}`,
                  userId: user.id,
                  userName: user.name,
                  userRole: user.role,
                  action: "attendance_recorded",
                  resourceType: "attendance",
                  details: `Recorded attendance for program ${selectedProgram}`,
                  timestamp: new Date().toISOString(),
                });
              }

              setShowMarkModal(false);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || e?.message || "Failed to record attendance");
            }
          }}
        />
      )}
    </div>
  );
}

function MarkAttendanceModal({
  programs,
  members,
  onClose,
  onSave,
}: {
  programs: ChurchProgram[];
  members: Member[];
  onClose: () => void;
  onSave: (attendance: AttendanceType[]) => Promise<void>;
}) {
  const [selectedProgram, setSelectedProgram] = useState("");
  const [attendanceData, setAttendanceData] = useState<Map<string, "present" | "absent">>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const filteredMembers = members.filter((m) => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) return;

    const newAttendance: AttendanceType[] = Array.from(attendanceData.entries()).map(([memberId, status]) => ({
      id: `att-${Date.now()}-${memberId}`,
      programId: selectedProgram,
      memberId,
      date: new Date().toISOString().split("T")[0],
      status,
      recordedBy: user?.name || "System",
      recordedAt: new Date().toISOString(),
    }));

    await onSave(newAttendance);
  };

  const toggleStatus = (memberId: string) => {
    const current = attendanceData.get(memberId) || "absent";
    const next = current === "absent" ? "present" : "absent";
    const newData = new Map(attendanceData);
    newData.set(memberId, next);
    setAttendanceData(newData);
  };

  const markAllPresent = () => {
    const newData = new Map<string, "present" | "absent">();
    filteredMembers.forEach((m) => newData.set(m.id, "present"));
    setAttendanceData(newData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-white border-b border-neutral-200 px-6 py-4">
          <h3 className="text-neutral-900">Mark Attendance</h3>
        </div>

        <form onSubmit={(e) => handleSubmit(e).catch(() => null)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 border-b border-neutral-200">
            <div>
              <label className="block text-sm text-neutral-700 mb-2">Select Program *</label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">-- Select a program --</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} - {new Date(program.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="button"
                onClick={markAllPresent}
                className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors"
              >
                Mark All Present
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredMembers.length > 0 ? (
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const status = attendanceData.get(member.id) || "absent";
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleStatus(member.id)}
                      className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">{member.fullName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-900">{member.fullName}</p>
                          <p className="text-xs text-neutral-500">{member.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                            status === "present" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"
                          }`}
                        >
                          {status === "present" && <CheckCircle2 className="w-3 h-3" />}
                          {status === "absent" && <XCircle className="w-3 h-3" />}
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-600 font-medium">No members match your search</p>
                <p className="text-sm text-neutral-500">Try a different name or clear the search term.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-neutral-200 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 transition-all"
            >
              Save Attendance ({attendanceData.size} records)
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
