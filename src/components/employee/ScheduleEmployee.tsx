"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getMySchedule, getSchedule, getWorkingToday } from "@/actions/scheduleActions";
import { getEmployees } from "@/actions/employeeActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { Schedule, ScheduleType, User } from "@/types/database";

const TYPE_COLORS: Record<ScheduleType, { dot: string; text: string; bg: string }> = {
  work: { dot: "bg-[var(--text-secondary)]", text: "text-[var(--text-secondary)]", bg: "bg-[var(--text-secondary)]/20" },
  off: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/20" },
  vacation: { dot: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]", bg: "bg-[var(--color-warning)]/20" },
  sick: { dot: "bg-[var(--color-error)]", text: "text-[var(--color-error)]", bg: "bg-[var(--color-error)]/20" },
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  work: "schedule.work",
  off: "schedule.off",
  vacation: "schedule.vacation",
  sick: "schedule.sick",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(ws: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws);
    d.setDate(ws.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleEmployee() {
  const { t } = useI18n();
  const user = useUserStore((s) => s.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teamSchedules, setTeamSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekDays = getWeekDays(weekStart);

  const loadData = useCallback(async () => {
    if (!user) return;
    const initData = useUserStore.getState().initData;
    const [schedResult, todayResult, empResult, teamSchedResult] = await Promise.all([
      getMySchedule(user.id, year, month, initData ?? ""),
      getWorkingToday(initData ?? ""),
      getEmployees(initData ?? ""),
      getSchedule(weekStart.getFullYear(), weekStart.getMonth() + 1, initData ?? ""),
    ]);
    if (schedResult.success && schedResult.data) setSchedules(schedResult.data);
    if (todayResult.success && todayResult.data) setWorkingToday(todayResult.data);
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    if (teamSchedResult.success && teamSchedResult.data) {
      const weekDates = weekDays.map(toDateStr);
      setTeamSchedules(teamSchedResult.data.filter((s) => weekDates.includes(s.date)));
    }
    setLoading(false);
  }, [user, year, month, weekStart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const getDayType = (day: number): ScheduleType => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = schedules.find((s) => s.date === dateStr);
    return entry?.type ?? "work";
  };

  const getTeamType = (userId: string, date: Date): ScheduleType => {
    const dateStr = toDateStr(date);
    const entry = teamSchedules.find((s) => s.user_id === userId && s.date === dateStr);
    return entry?.type ?? "work";
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const monthNames = [
    t("month.january"), t("month.february"), t("month.march"), t("month.april"), t("month.may"), t("month.june"),
    t("month.july"), t("month.august"), t("month.september"), t("month.october"), t("month.november"), t("month.december"),
  ];

  const dayNames = [t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat"), t("day.sun")];
  const today = new Date();
  const todayStr = toDateStr(today);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
          {t("schedule.mySchedule")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
          {monthNames[month - 1]} {year}
        </h1>
      </header>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex gap-2">
          {(["work", "off", "vacation", "sick"] as const).map((type) => (
              <span key={type} className={`flex items-center gap-1.5 text-[11px] font-medium ${TYPE_COLORS[type].text}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[type].dot}`} />
                {t(TYPE_LABELS[type])}
              </span>
          ))}
        </div>
        <button onClick={nextMonth} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="py-1 text-center text-[11px] font-medium text-[var(--text-secondary)]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: (new Date(year, month - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const type = getDayType(day);
            const colors = TYPE_COLORS[type];
            const isToday = todayStr === `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            return (
              <div
                key={day}
                className={`flex flex-col items-center rounded-lg py-1.5 ${
                  isToday ? "ring-1 ring-[var(--brand-primary)]/50" : ""
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {day}
                </span>
                <span className={`mt-1 h-2 w-2 rounded-full ${colors.dot}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Team this week - read only */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)] mb-1">
          {t("schedule.teamWeek")}
        </p>
        <p className="text-sm font-bold text-[var(--text-primary)] mb-3">
          {format(weekDays[0], "d MMM", { locale: ru })} – {format(weekDays[6], "d MMM", { locale: ru })}
        </p>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[var(--bg-surface)] p-2 text-left text-[11px] font-medium text-[var(--text-secondary)] min-w-[80px]">
                  {t("payroll.employee")}
                </th>
                {weekDays.map((day, i) => {
                  const isToday = toDateStr(day) === todayStr;
                  return (
                    <th key={i} className="p-1 text-center">
                      <div className={`text-[10px] font-medium ${isToday ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-secondary)]"}`}>
                        {dayNames[i]}
                      </div>
                      <div className={`text-[12px] font-bold ${isToday ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.filter((e) => e.id !== user?.id).map((emp) => (
                <tr key={emp.id} className="border-t border-[var(--border-color)]">
                  <td className="sticky left-0 z-20 bg-[var(--bg-surface)] py-1.5 pr-2 min-w-[80px]">
                    <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">{emp.full_name}</p>
                  </td>
                  {weekDays.map((day, i) => {
                    const type = getTeamType(emp.id, day);
                    const colors = TYPE_COLORS[type];
                    const isToday = toDateStr(day) === todayStr;
                    return (
                      <td key={i} className="p-0.5">
                        <div
                          className={`flex h-8 w-full items-center justify-center rounded-lg text-[10px] font-bold ${colors.bg} ${colors.text} ${isToday ? "ring-1 ring-[var(--brand-primary)]/20" : ""}`}
                        >
                          {type === "work" ? t("schedule.abbrWork") : type === "off" ? t("schedule.abbrOff") : type === "vacation" ? t("schedule.abbrVacation") : t("schedule.abbrSick")}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {workingToday.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            {t("schedule.todayOnShift")}
          </h2>
          <div className="space-y-2">
            {workingToday.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{w.full_name}</p>
                  {w.position && (
                    <p className="text-[11px] text-[var(--text-secondary)]">{w.position}</p>
                  )}
                </div>
                {w.clock_in ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                    <span className="text-[11px] text-[var(--brand-primary)]">{t("shift.onShift")}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--text-secondary)]">{t("schedule.notArrived")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
