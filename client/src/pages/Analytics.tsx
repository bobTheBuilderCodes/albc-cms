import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Donation, Expenditure, Member } from "../types";
import {
  fetchFinance,
  fetchMembers,
  fetchSundayAttendanceByYear,
  fetchSundayAttendanceYears,
  type SundayAttendanceRecord,
} from "../api/backend";

type AnalyticsTab = "finance" | "attendance" | "growth";
type FinanceAttendanceRange = "weekly" | "monthly" | "quarterly";
type GrowthRange = "monthly" | "quarterly" | "yearly";

const toUtcDayStart = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getSundayKeyUtc = (date: Date): string => date.toISOString().slice(0, 10);

const getLastSubmittedSundayKeyUtc = (now: Date): string => {
  const dayStart = toUtcDayStart(now);
  const dayOfWeek = dayStart.getUTCDay();
  const mostRecentSunday = new Date(dayStart);
  mostRecentSunday.setUTCDate(dayStart.getUTCDate() - dayOfWeek);

  const isAfterWednesdayCutoff = dayOfWeek > 3 || (dayOfWeek === 3 && now.getUTCHours() >= 18);
  if (isAfterWednesdayCutoff) return getSundayKeyUtc(mostRecentSunday);

  mostRecentSunday.setUTCDate(mostRecentSunday.getUTCDate() - 7);
  return getSundayKeyUtc(mostRecentSunday);
};

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function Analytics() {
  const [tab, setTab] = useState<AnalyticsTab>("finance");
  const [financeRange, setFinanceRange] = useState<FinanceAttendanceRange>("monthly");
  const [attendanceRange, setAttendanceRange] = useState<FinanceAttendanceRange>("monthly");
  const [growthRange, setGrowthRange] = useState<GrowthRange>("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [attendanceYears, setAttendanceYears] = useState<number[]>([]);
  const [sundayAttendance, setSundayAttendance] = useState<SundayAttendanceRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const [memberData, financeData, sundayYears] = await Promise.all([
        fetchMembers(),
        fetchFinance(),
        fetchSundayAttendanceYears(),
      ]);
      setMembers(memberData);
      setDonations(financeData.donations);
      setExpenditures(financeData.expenditures);
      setAttendanceYears(sundayYears);
    };

    load().catch((e) => console.error("Analytics load failed", e));
  }, []);

  useEffect(() => {
    fetchSundayAttendanceByYear(selectedYear)
      .then((result) => setSundayAttendance(result.records))
      .catch((e) => {
        console.error("Failed to load Sunday attendance for analytics", e);
        setSundayAttendance([]);
      });
  }, [selectedYear]);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set([
          ...donations.map((d) => new Date(d.date).getFullYear()),
          ...expenditures.map((e) => new Date(e.date).getFullYear()),
          ...members.map((m) => new Date(m.joinDate || m.createdAt).getFullYear()),
          ...attendanceYears,
          new Date().getFullYear(),
        ])
      ).sort((a, b) => b - a),
    [attendanceYears, donations, expenditures, members]
  );

  const submittedAttendance = useMemo(() => {
    const cutoffKey = getLastSubmittedSundayKeyUtc(new Date());
    return sundayAttendance.filter((r) => r.sundayKey <= cutoffKey);
  }, [sundayAttendance]);

  const financeData = useMemo(() => {
    if (financeRange === "monthly") {
      return monthLabels.map((month, index) => {
        const income = donations
          .filter((d) => {
            const dt = new Date(d.date);
            return dt.getFullYear() === selectedYear && dt.getMonth() === index;
          })
          .reduce((sum, d) => sum + d.amount, 0);
        const expense = expenditures
          .filter((e) => {
            const dt = new Date(e.date);
            return dt.getFullYear() === selectedYear && dt.getMonth() === index;
          })
          .reduce((sum, e) => sum + e.amount, 0);
        return { name: month, Income: income, Expenditure: expense };
      });
    }

    return ["Q1", "Q2", "Q3", "Q4"].map((q, index) => {
      const startMonth = index * 3;
      const endMonth = startMonth + 3;
      const income = donations
        .filter((d) => {
          const dt = new Date(d.date);
          return dt.getFullYear() === selectedYear && dt.getMonth() >= startMonth && dt.getMonth() < endMonth;
        })
        .reduce((sum, d) => sum + d.amount, 0);
      const expense = expenditures
        .filter((e) => {
          const dt = new Date(e.date);
          return dt.getFullYear() === selectedYear && dt.getMonth() >= startMonth && dt.getMonth() < endMonth;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: q, Income: income, Expenditure: expense };
    });
  }, [donations, expenditures, financeRange, selectedYear]);

  const attendanceData = useMemo(() => {
    if (attendanceRange === "weekly") {
      return submittedAttendance
        .filter((r) => new Date(r.sundayDate).getFullYear() === selectedYear)
        .reduce<Array<{ name: string; sundayKey: string; Present: number; Absent: number }>>((acc, record) => {
          const existing = acc.find((entry) => entry.sundayKey === record.sundayKey);
          if (existing) {
            if (record.status === "present") existing.Present += 1;
            if (record.status === "absent") existing.Absent += 1;
            return acc;
          }

          acc.push({
            name: new Date(`${record.sundayKey}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            sundayKey: record.sundayKey,
            Present: record.status === "present" ? 1 : 0,
            Absent: record.status === "absent" ? 1 : 0,
          });
          return acc;
        }, [])
        .sort((a, b) => a.sundayKey.localeCompare(b.sundayKey));
    }

    if (attendanceRange === "monthly") {
      return monthLabels.map((month, index) => {
        const records = submittedAttendance.filter((r) => {
          const dt = new Date(r.sundayDate);
          return dt.getFullYear() === selectedYear && dt.getMonth() === index;
        });
        const present = records.filter((r) => r.status === "present").length;
        const absent = records.filter((r) => r.status === "absent").length;
        return { name: month, Present: present, Absent: absent };
      });
    }

    return ["Q1", "Q2", "Q3", "Q4"].map((q, index) => {
      const startMonth = index * 3;
      const endMonth = startMonth + 3;
      const records = submittedAttendance.filter((r) => {
        const dt = new Date(r.sundayDate);
        return dt.getFullYear() === selectedYear && dt.getMonth() >= startMonth && dt.getMonth() < endMonth;
      });
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      return { name: q, Present: present, Absent: absent };
    });
  }, [attendanceRange, selectedYear, submittedAttendance]);

  const growthData = useMemo(() => {
    const memberJoinDate = (member: Member) => new Date(member.joinDate || member.createdAt || new Date().toISOString());

    if (growthRange === "monthly") {
      return monthLabels.map((month, index) => {
        const count = members.filter((m) => {
          const dt = memberJoinDate(m);
          return dt.getFullYear() === selectedYear && dt.getMonth() === index;
        }).length;
        return { name: month, Members: count };
      });
    }

    if (growthRange === "quarterly") {
      return ["Q1", "Q2", "Q3", "Q4"].map((q, index) => {
        const startMonth = index * 3;
        const endMonth = startMonth + 3;
        const count = members.filter((m) => {
          const dt = memberJoinDate(m);
          return dt.getFullYear() === selectedYear && dt.getMonth() >= startMonth && dt.getMonth() < endMonth;
        }).length;
        return { name: q, Members: count };
      });
    }

    const years = Array.from(new Set(members.map((m) => memberJoinDate(m).getFullYear()))).sort((a, b) => a - b);
    return years.map((year) => ({
      name: String(year),
      Members: members.filter((m) => memberJoinDate(m).getFullYear() === year).length,
    }));
  }, [growthRange, members, selectedYear]);

  const totalIncome = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalExpenses = expenditures.reduce((sum, e) => sum + e.amount, 0);
  const totalAttendanceRecords = submittedAttendance.length;
  const totalPresent = submittedAttendance.filter((r) => r.status === "present").length;
  const attendanceRate = totalAttendanceRecords > 0 ? (totalPresent / totalAttendanceRecords) * 100 : 0;
  const growthThisYear = members.filter((m) => new Date(m.joinDate || m.createdAt).getFullYear() === selectedYear).length;

  const currentData = tab === "finance" ? financeData : tab === "attendance" ? attendanceData : growthData;
  const hasData = currentData.some((entry) =>
    Object.values(entry).some((value) => typeof value === "number" && value > 0)
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-neutral-900 mb-0 text-xl sm:text-2xl font-bold">Analytics</h1>
        <p className="text-neutral-600 text-sm sm:text-base">Track finance, attendance and church growth trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-1 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500">Total Income</p>
          <p className="text-xl font-bold text-neutral-900">GH₵ {totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500">Total Expenditure</p>
          <p className="text-xl font-bold text-neutral-900">GH₵ {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500">Attendance Rate</p>
          <p className="text-xl font-bold text-neutral-900">{attendanceRate.toFixed(0)}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-neutral-200">
          <p className="text-xs text-neutral-500">Growth ({selectedYear})</p>
          <p className="text-xl font-bold text-neutral-900">{growthThisYear} members</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
          <div>
            <p className="text-xs text-neutral-500">Total Members</p>
            <p className="text-lg font-semibold text-neutral-900">{members.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
          <div>
            <p className="text-xs text-neutral-500">Net Finance</p>
            <p className="text-lg font-semibold text-neutral-900">GH₵ {(totalIncome - totalExpenses).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setTab("finance")}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "finance" ? "bg-gray-200 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              Income vs Expenditure
            </button>
            <button
              onClick={() => setTab("attendance")}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "attendance" ? "bg-gray-200 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              Attendance
            </button>
            <button
              onClick={() => setTab("growth")}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${tab === "growth" ? "bg-gray-200 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              Church Growth
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg overflow-x-auto no-scrollbar">
              {tab === "attendance" && (
                <button
                  onClick={() => setAttendanceRange("weekly")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${attendanceRange === "weekly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  Weekly
                </button>
              )}
              {tab === "finance" && (
                <>
                  <button
                    onClick={() => setFinanceRange("monthly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${financeRange === "monthly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setFinanceRange("quarterly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${financeRange === "quarterly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Quarterly
                  </button>
                </>
              )}
              {tab === "attendance" && (
                <>
                  <button
                    onClick={() => setAttendanceRange("monthly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${attendanceRange === "monthly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setAttendanceRange("quarterly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${attendanceRange === "quarterly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Quarterly
                  </button>
                </>
              )}
              {tab === "growth" && (
                <>
                  <button
                    onClick={() => setGrowthRange("monthly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${growthRange === "monthly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setGrowthRange("quarterly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${growthRange === "quarterly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Quarterly
                  </button>
                  <button
                    onClick={() => setGrowthRange("yearly")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${growthRange === "yearly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                  >
                    Yearly
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {hasData ? (
          <ResponsiveContainer width="100%" height={360}>
            {tab === "finance" ? (
              <BarChart data={financeData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expenditure" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : tab === "attendance" ? (
              <LineChart data={attendanceData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              <LineChart data={growthData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={{ stroke: "#e5e7eb" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Members" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500 font-medium mb-1">No data available for this view</p>
            <p className="text-xs text-neutral-400 font-medium">Change year or add records to see analytics</p>
          </div>
        )}
      </div>


    </div>
  );
}
