"use client";

import { useEffect, useState } from "react";
import { getSchedule, setScheduleDay, getWorkingToday } from "@/actions/scheduleActions";
import { getEmployees } from "@/actions/employeeActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { Schedule, ScheduleType, User } from "@/types/database";

const TYPE_COLORS: Record<ScheduleType, { bg: string; text: string; dot: string }> = {
  work: { bg: "bg-[var(--brand-primary)]/20", text: "text-[var(--brand-primary)]", dot: "bg-[var(--brand-primary)]" },
  off: { bg: "bg-[var(--text-secondary)]/20", text: "text-[var(--text-secondary)]", dot: "bg-[var(--text-secondary)]" },
  vacation: { bg: "bg-[var(--color-warning)]/20", text: "text-[var(--color-warning)]", dot: "bg-[var(--color-warning)]" },
  sick: { bg: "bg-[var(--color-error)]/20", text: "text-[var(--color-error)]", dot: "bg-[var(--color-error)]" },
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  work: "schedule.work",
  off: "schedule.off",
  vacation: "schedule.vacation",
  sick: "schedule.sick",
};

const TYPE_ORDER: ScheduleType[] = ["work", "off", "vacation", "sick"];

export function ScheduleAdmin({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const currentUser = useUserStore((s) => s.user);
  const [employees, setEmployees] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  async function loadData() {
    const [schedResult, empResult, todayResult] = await Promise.all([
      getSchedule(year, month),
      getEmployees(),
      getWorkingToday(),
    ]);
    if (schedResult.success && schedResult.data) setSchedules(schedResult.data);
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    if (todayResult.success && todayResult.data) setWorkingToday(todayResult.data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const getScheduleType = (userId: string, day: number): ScheduleType => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = schedules.find((s) => s.user_id === userId && s.date === dateStr);
    return entry?.type ?? "work";
  };

  const cycleType = (userId: string, day: number) => {
    const current = getScheduleType(userId, day);
    const idx = TYPE_ORDER.indexOf(current);
    const next = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length];
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setSchedules((prev) => {
      const filtered = prev.filter((s) => !(s.user_id === userId && s.date === dateStr));
      return [...filtered, { id: "temp", user_id: userId, date: dateStr, type: next, created_at: "" }];
    });

    void setScheduleDay(userId, dateStr, next);
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

  const dayLabels = [t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat"), t("day.sun")];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border-color)] px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
              {t("schedule.subtitle")}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("schedule.title")}</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("schedule.myMonth")}</p>
            <div className="flex items-center gap-2">
              {(["work", "off", "vacation", "sick"] as const).map((type) => (
                <span key={type} className="flex items-center gap-1 text-[10px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${TYPE_COLORS[type].dot}`} />
                  <span className={TYPE_COLORS[type].text}>{t(TYPE_LABELS[type])}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayLabels.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: (new Date(year, month - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const type = currentUser ? getScheduleType(currentUser.id, day) : "work";
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
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 px-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {monthNames[month - 1]} {year}
            </p>
            <button onClick={nextMonth} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
      </div>

      <div className="mt-3 flex-1 overflow-x-auto px-4 pb-24 relative">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-[var(--bg-app)] p-1.5 text-left text-[11px] font-medium text-[var(--text-secondary)] min-w-[100px] shadow-[8px_0_12px_-4px_rgba(0,0,0,0.05)]">
                {t("salary.employee")}
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = new Date(year, month - 1, day);
                const dow = (date.getDay() + 6) % 7;
                const isWeekend = dow >= 5;
                return (
                  <th
                    key={day}
                    className={`p-1 text-center text-[11px] font-medium ${isWeekend ? "text-[var(--color-error)]" : "text-[var(--text-secondary)]"}`}
                  >
                    <div className={isWeekend ? "font-bold" : ""}>{day}</div>
                    <div className={`text-[9px] ${isWeekend ? "text-[var(--color-error)]/60" : ""}`}>{dayLabels[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="sticky left-0 z-20 bg-[var(--bg-app)] py-1.5 pr-3 min-w-[100px] shadow-[8px_0_12px_-4px_rgba(0,0,0,0.05)]">
                  <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{emp.full_name}</p>
                  {emp.position && (
                    <p className="truncate text-[9px] text-[var(--text-secondary)]">{emp.position}</p>
                  )}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const type = getScheduleType(emp.id, day);
                  const colors = TYPE_COLORS[type];
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        onClick={() => cycleType(emp.id, day)}
                        className={`h-9 w-9 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${colors.bg} ${colors.text}`}
                      >
                        {type === "work" ? "Р" : type === "off" ? "—" : type === "vacation" ? "О" : "Б"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {workingToday.length > 0 && (
        <div className="border-t border-[var(--border-color)] px-4 pt-4 pb-24">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
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
                    <p className="text-[10px] text-[var(--text-secondary)]">{w.position}</p>
                  )}
                </div>
                {w.clock_in ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                    <span className="text-[10px] text-[var(--brand-primary)]">{t("shift.onShift")}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--text-secondary)]">{t("schedule.notArrived")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
