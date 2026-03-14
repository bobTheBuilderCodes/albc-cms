import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowUpRight, Cake, Calendar, Clock, UserCircle2 } from "lucide-react";
import type { ChurchProgram, Member } from "../types";
import { fetchMembers, fetchPrograms, fetchSettings } from "../api/backend";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [churchName, setChurchName] = useState("Church");

  useEffect(() => {
    const load = async () => {
      const [mem, pro, settings] = await Promise.all([fetchMembers(), fetchPrograms(), fetchSettings()]);
      setMembers(mem);
      setPrograms(pro);
      setChurchName(settings?.churchName || "Church");
    };

    load().catch((e) => console.error("Dashboard load failed", e));
  }, []);

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
        .sort((a, b) => new Date(a.dateOfBirth).getDate() - new Date(b.dateOfBirth).getDate())
        .slice(0, 8),
    [members, currentMonth]
  );

  const upcomingPrograms = useMemo(
    () =>
      programs
        .filter((p) => new Date(p.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 6),
    [programs, today]
  );

  const firstName = user?.name?.split(" ")[0] || "User";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "N/A";

  return (
    <div className="max-w-7xl mx-auto">
      <section className="relative overflow-hidden rounded-none sm: p-5 lg:p-8 bg-linear-to-r from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-20 bg-linear-to-tr from-cyan-400 via-transparent to-blue-300" />
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative z-10 space-y-1">
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-blue-100/80 font-semibold">{churchName}</p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Welcome {firstName}</h1>
          
          <div className="mt-3 inline-flex items-center rounded-xl bg-white/10 px-3 py-0 text-sm text-blue-50 backdrop-blur-xs">
            Theme for {new Date().getFullYear()}: Growing together in faith and service.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8">
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-700" />
                </div>
                <h2 className="text-neutral-900 font-semibold">Upcoming Programs</h2>
              </div>
              <button
                onClick={() => navigate("/programs")}
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
              >
                View all
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingPrograms.length > 0 ? (
                upcomingPrograms.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-start gap-4 rounded-xl p-4 bg-slate-50/80"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(program.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg leading-none font-bold">{new Date(program.date).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base text-neutral-900 font-semibold truncate">
                        {program.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {program.time}
                        </span>
                        <span className="truncate">{program.location || "Main auditorium"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl p-10 text-center bg-white border border-neutral-200 shadow-sm">
                  <Calendar className="w-8 h-8 mx-auto text-neutral-400 mb-3" />
                  <p className="text-sm text-neutral-600 font-medium">No upcoming programs</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Cake className="w-5 h-5 text-amber-700 dark:text-amber-200" />
                </div>
                <h2 className="text-neutral-900 dark:text-slate-100 font-semibold">Birthdays This Month</h2>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200">
                {birthdaysThisMonth.length}
              </span>
            </div>
            <div className="space-y-3">
              {birthdaysThisMonth.length > 0 ? (
                birthdaysThisMonth.map((member) => {
                  const dob = new Date(member.dateOfBirth);
                  const isToday = dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-4 rounded-xl p-4 birthday-card ${
                        isToday ? "birthday-card--today text-amber-900 dark:text-amber-100" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-semibold uppercase">
                          {dob.toLocaleDateString("en-US", { month: "short" })}
                        </span>
                        <span className="text-lg leading-none font-bold">{dob.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-slate-100 truncate">
                          {member.fullName}
                        </p>
                        <p className="text-xs sm:text-sm text-neutral-600 dark:text-slate-300 truncate">
                          {member.department || "General"}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl p-10 text-center bg-white border border-neutral-200 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
                  <Cake className="w-8 h-8 mx-auto text-neutral-400 dark:text-slate-400 mb-3" />
                  <p className="text-sm text-neutral-600 dark:text-slate-300 font-medium">No birthdays this month</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="xl:col-span-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6 space-y-5">
            <h2 className="text-neutral-900 font-semibold">My Profile Summary</h2>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-neutral-900 font-semibold truncate">{user?.name || "User"}</p>
                <p className="text-sm text-neutral-600 truncate">{user?.email || "-"}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-neutral-500">Access Level</p>
                <p className="text-neutral-900 capitalize font-medium">{user?.role || "-"}</p>
              </div>
              <div>
                <p className="text-neutral-500">Member Since</p>
                <p className="text-neutral-900 font-medium">{memberSince}</p>
              </div>
              <div>
                <p className="text-neutral-500">Permissions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(user?.modules || []).length > 0 ? (
                    user?.modules.map((module) => (
                      <span
                        key={module}
                        className="px-2 py-1 rounded-md text-xs font-medium bg-white border border-neutral-200 text-neutral-700"
                      >
                        {module}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-500">No permissions assigned</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/profile-settings")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 text-sm font-semibold transition-colors"
            >
              <UserCircle2 className="w-4 h-4" />
              View profile settings
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}
