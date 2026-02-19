import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, BarChart3, Cake, Calendar, Clock } from "lucide-react";
import type { ChurchProgram, Donation, Expenditure, Member } from "../types";
import {
  fetchFinance,
  fetchMembers,
  fetchPrograms,
  fetchSundayAttendanceByYear,
  fetchSundayAttendanceYears,
  type SundayAttendanceRecord,
} from "../api/backend";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type RangeType = "weekly" | "monthly" | "quarterly";
type ChartTab = "finance" | "attendance";

const toUtcDayStart = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getSundayKeyUtc = (date: Date): string => date.toISOString().slice(0, 10);

const getLastSubmittedSundayKeyUtc = (now: Date): string => {
  const dayStart = toUtcDayStart(now);
  const dayOfWeek = dayStart.getUTCDay(); // 0 = Sunday
  const mostRecentSunday = new Date(dayStart);
  mostRecentSunday.setUTCDate(dayStart.getUTCDate() - dayOfWeek);

  const isAfterWednesdayCutoff = dayOfWeek > 3 || (dayOfWeek === 3 && now.getUTCHours() >= 18);
  if (isAfterWednesdayCutoff) {
    return getSundayKeyUtc(mostRecentSunday);
  }

  mostRecentSunday.setUTCDate(mostRecentSunday.getUTCDate() - 7);
  return getSundayKeyUtc(mostRecentSunday);
};

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [sundayAttendance, setSundayAttendance] = useState<SundayAttendanceRecord[]>([]);
  const [attendanceYears, setAttendanceYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rangeType, setRangeType] = useState<RangeType>("monthly");
  const [chartTab, setChartTab] = useState<ChartTab>("finance");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [mem, pro, finance, sundayYears] = await Promise.all([
        fetchMembers(),
        fetchPrograms(),
        fetchFinance(),
        fetchSundayAttendanceYears(),
      ]);
      setMembers(mem);
      setPrograms(pro);
      setDonations(finance.donations);
      setExpenditures(finance.expenditures);
      setAttendanceYears(sundayYears);
    };

    load().catch((e) => console.error("Dashboard load failed", e));
  }, []);

  useEffect(() => {
    fetchSundayAttendanceByYear(selectedYear)
      .then((result) => setSundayAttendance(result.records))
      .catch((e) => {
        console.error("Failed to load Sunday attendance for dashboard", e);
        setSundayAttendance([]);
      });
  }, [selectedYear]);

  const today = new Date();
  const currentMonth = today.getMonth();

  const birthdaysThisMonth = useMemo(
    () =>
      members
        .filter((m) => {
          if (!m.dateOfBirth) return false;
          const dob = new Date(m.dateOfBirth);
          return !Number.isNaN(dob.getTime()) && dob.getMonth() === currentMonth;
        })
        .sort((a, b) => new Date(a.dateOfBirth).getDate() - new Date(b.dateOfBirth).getDate()),
    [members, currentMonth]
  );

  const upcomingPrograms = useMemo(() => programs.filter((p) => new Date(p.date) >= today).slice(0, 5), [programs, today]);
  const activeMembers = members.filter((m) => m.membershipStatus === "active").length;
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalExpenditures = expenditures.reduce((sum, e) => sum + e.amount, 0);
  const lastSubmittedSundayKeyUtc = getLastSubmittedSundayKeyUtc(today);
  const submittedSundayAttendance = useMemo(
    () => sundayAttendance.filter((r) => r.sundayKey <= lastSubmittedSundayKeyUtc),
    [sundayAttendance, lastSubmittedSundayKeyUtc]
  );

  const totalSundayRecords = submittedSundayAttendance.length;
  const totalSundayPresent = submittedSundayAttendance.filter((r) => r.status === "present").length;
  const averageAttendanceRate = totalSundayRecords > 0 ? (totalSundayPresent / totalSundayRecords) * 100 : 0;
  const sundayCount = new Set(submittedSundayAttendance.map((r) => r.sundayKey)).size;
  const averagePresentPerSunday = sundayCount > 0 ? totalSundayPresent / sundayCount : 0;

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set([
          ...donations.map((d) => new Date(d.date).getFullYear()),
          ...expenditures.map((e) => new Date(e.date).getFullYear()),
          ...attendanceYears,
          new Date().getFullYear(),
        ])
      ).sort((a, b) => b - a),
    [donations, expenditures, attendanceYears]
  );

  const financeChartData = useMemo(() => {
    if (rangeType === "monthly") {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, index) => {
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
  }, [donations, expenditures, rangeType, selectedYear]);

  const attendanceChartData = useMemo(() => {
    if (rangeType === "weekly") {
      return submittedSundayAttendance
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

    if (rangeType === "monthly") {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, index) => {
        const records = submittedSundayAttendance.filter((r) => {
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
      const records = submittedSundayAttendance.filter((r) => {
        const dt = new Date(r.sundayDate);
        return dt.getFullYear() === selectedYear && dt.getMonth() >= startMonth && dt.getMonth() < endMonth;
      });
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      return { name: q, Present: present, Absent: absent };
    });
  }, [rangeType, selectedYear, submittedSundayAttendance]);

  const graphData = chartTab === "finance" ? financeChartData : attendanceChartData;
  const hasGraphData = graphData.some((entry) => Object.values(entry).some((value) => typeof value === "number" && value > 0));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-neutral-900 mb-0 text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-neutral-600 font-medium">Welcome to your church management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => navigate("/members")}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-primary-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10"
        >
          <p className="text-3xl text-neutral-900 mb-1 font-bold">{members.length}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Members</p>
          <p className="text-xs text-neutral-500 font-medium">{activeMembers} active members</p>
        </div>

        <div
          onClick={() => navigate("/attendance")}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-accent-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/10"
        >
          <p className="text-3xl text-neutral-900 mb-1 font-bold">{averageAttendanceRate.toFixed(0)}%</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Average Attendance</p>
          <p className="text-xs text-neutral-500 font-medium">{Math.round(averagePresentPerSunday)} avg present / Sunday</p>
        </div>

        <div
          onClick={() => navigate("/finance")}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-success-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-success-500/10"
        >
          <p className="text-3xl text-neutral-900 mb-1 font-bold">GH₵ {totalDonations.toLocaleString()}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Income</p>
          <p className="text-xs text-neutral-500 font-medium">{donations.length} transactions</p>
        </div>

        <div
          onClick={() => navigate("/finance")}
          className="group bg-white rounded-2xl p-6 border border-neutral-200 hover:border-danger-300 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-danger-500/10"
        >
          <p className="text-3xl text-neutral-900 mb-1 font-bold">GH₵ {totalExpenditures.toLocaleString()}</p>
          <p className="text-sm text-neutral-600 font-medium mb-2">Total Expenses</p>
          <p className="text-xs text-neutral-500 font-medium">{expenditures.length} transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="text-neutral-900 font-semibold">Upcoming Programs</h3>
            </div>
            <button
              onClick={() => navigate("/programs")}
              className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
            {upcomingPrograms.length > 0 ? (
              upcomingPrograms.map((program) => (
                <div key={program.id} className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                  <div className="w-12 h-12 bg-linear-to-br from-accent-400 to-accent-500 rounded-xl flex flex-col items-center justify-center text-white shrink-0">
                    <span className="text-xs font-semibold">{new Date(program.date).toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="text-lg font-bold leading-none">{new Date(program.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 font-semibold truncate">{program.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-neutral-600 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {program.time}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">{program.location}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 font-medium">No upcoming programs</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
                <Cake className="w-5 h-5 text-warning-600" />
              </div>
              <h3 className="text-neutral-900 font-semibold">Birthdays This Month</h3>
            </div>
            {birthdaysThisMonth.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 bg-warning-50 text-warning-700 text-xs font-semibold rounded-lg">
                {birthdaysThisMonth.length} {birthdaysThisMonth.length === 1 ? "birthday" : "birthdays"}
              </span>
            )}
          </div>
          <div className="space-y-3 max-h-100 overflow-y-auto pr-2">
            {birthdaysThisMonth.length > 0 ? (
              birthdaysThisMonth.map((member) => {
                const dob = new Date(member.dateOfBirth);
                const isToday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-4 rounded-xl ${isToday ? "bg-gray-50 text-gray-700 border-2 border-warning-300" : "bg-gray-50 text-gray-700"}`}
                  >
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-gray-700 shrink-0">
                      <span className="text-xs font-semibold">{dob.toLocaleDateString("en-US", { month: "short" })}</span>
                      <span className="text-lg font-bold leading-none">{dob.getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-neutral-900 font-semibold">{member.fullName}</p>
                      <p className="text-xs text-neutral-600 font-medium">{member.department}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Cake className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 font-medium">No birthdays this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="text-neutral-900 font-semibold">Analytics</h3>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg">
              {chartTab === "attendance" && (
                <button
                  onClick={() => setRangeType("weekly")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${rangeType === "weekly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  Weekly
                </button>
              )}
              <button
                onClick={() => setRangeType("monthly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${rangeType === "monthly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setRangeType("quarterly")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${rangeType === "quarterly" ? "bg-white text-primary-600 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                Quarterly
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setChartTab("finance")}
            className={`px-4 py-2 rounded-lg transition-colors ${chartTab === "finance" ? "bg-gray-200 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            Income vs Expenditure
          </button>
          <button
            onClick={() => setChartTab("attendance")}
            className={`px-4 py-2 rounded-lg transition-colors ${chartTab === "attendance" ? "bg-gray-200 text-primary-700" : "text-neutral-600 hover:bg-neutral-100"}`}
          >
            Attendance
          </button>
          <button
            onClick={() => navigate(chartTab === "finance" ? "/finance" : "/attendance")}
            className="ml-auto text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
          >
            View Details
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {hasGraphData ? (
          <ResponsiveContainer width="100%" height={350}>
            {chartTab === "finance" ? (
              <BarChart data={graphData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => `GH₵${Number(value).toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: unknown, name?: string) => {
                    const numeric = Number(value || 0);
                    return [`GH₵${numeric.toLocaleString()}`, name || ""];
                  }}
                  labelStyle={{ fontWeight: 600, color: "#111827" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expenditure" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={graphData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: unknown, name?: string) => [Number(value || 0).toLocaleString(), name || ""]}
                  labelStyle={{ fontWeight: 600, color: "#111827" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
