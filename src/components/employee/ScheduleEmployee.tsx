"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ro, ru } from "date-fns/locale";
import { getSchedule, getWorkingToday, getColleagues } from "@/actions/scheduleActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import { TYPE_COLORS } from "@/lib/schedule-constants";
import type { Schedule, ScheduleType, User } from "@/types/database";

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
  const { t, locale } = useI18n();
  const dateLocale = locale === "ro" ? ro : ru;
  const user = useUserStore((s) => s.user);
  const [teamSchedules, setTeamSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Pick<User, "id" | "full_name" | "position">[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDays(weekStart);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const initData = useUserStore.getState().initData;
    const [todayResult, empResult, teamSchedResult] = await Promise.all([
      getWorkingToday(initData ?? ""),
      getColleagues(initData ?? ""),
      getSchedule(weekStart.getFullYear(), weekStart.getMonth() + 1, initData ?? ""),
    ]);
    if (signal?.aborted) return;
    if (todayResult.success && todayResult.data) setWorkingToday(todayResult.data);
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    if (teamSchedResult.success && teamSchedResult.data) {
      const weekDates = weekDays.map(toDateStr);
      setTeamSchedules(teamSchedResult.data.filter((s) => weekDates.includes(s.date)));
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const getTeamType = (userId: string, date: Date): ScheduleType => {
    const dateStr = toDateStr(date);
    const entry = teamSchedules.find((s) => s.user_id === userId && s.date === dateStr);
    return entry?.type ?? "work";
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

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
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
          {t("schedule.subtitle")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("schedule.title")}</h1>
      </header>

      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {format(weekDays[0], "d MMM", { locale: dateLocale })} – {format(weekDays[6], "d MMM", { locale: dateLocale })}
          </p>
          {!isCurrentWeek && (
            <button onClick={goToThisWeek} className="mt-1.5 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-4 py-1.5 text-xs font-bold text-[var(--brand-primary)] transition-all active:scale-95 hover:bg-[var(--brand-primary)]/20">
              ← {t("schedule.thisWeek")}
            </button>
          )}
        </div>
        <button onClick={nextWeek} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {(["work", "off", "vacation", "sick"] as const).map((type) => (
          <span key={type} className="flex items-center gap-1 text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${TYPE_COLORS[type].dot}`} />
            <span className={TYPE_COLORS[type].text}>{t(`schedule.${type}`)}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex-1 pb-24">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-[var(--bg-surface)] p-2 text-left text-xs font-medium text-[var(--text-secondary)] min-w-[90px]">
                  {t("payroll.employee")}
                </th>
                {weekDays.map((day, i) => {
                  const isToday = toDateStr(day) === todayStr;
                  return (
                    <th key={i} className="p-1.5 text-center">
                      <div className={`text-xs font-medium ${isToday ? "text-[var(--brand-primary)] font-bold" : "text-[var(--text-secondary)]"}`}>
                        {dayNames[i]}
                      </div>
                      <div className={`text-[13px] font-bold ${isToday ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isMe = emp.id === user?.id;
                return (
                  <tr key={emp.id} className={`border-t border-[var(--border-color)] ${isMe ? "bg-[var(--brand-primary)]/5" : ""}`}>
                    <td className="sticky left-0 z-20 bg-[var(--bg-surface)] py-2 pr-2 min-w-[90px]">
                      <p className={`truncate text-xs font-semibold ${isMe ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]"}`}>
                        {emp.full_name}
                        {isMe && <span className="ml-1 text-[9px] font-bold">★</span>}
                      </p>
                      {emp.position && (
                        <p className="truncate text-[10px] text-[var(--text-secondary)]">{emp.position}</p>
                      )}
                    </td>
                    {weekDays.map((day, i) => {
                      const type = getTeamType(emp.id, day);
                      const colors = TYPE_COLORS[type];
                      const isToday = toDateStr(day) === todayStr;
                      return (
                        <td key={i} className="p-0.5">
                          <div
                            className={`flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold ${colors.bg} ${colors.text} ${isToday ? "ring-1 ring-[var(--brand-primary)]/30" : ""}`}
                          >
                            {type === "work" ? t("schedule.abbrWork") : type === "off" ? t("schedule.abbrOff") : type === "vacation" ? t("schedule.abbrVacation") : t("schedule.abbrSick")}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {workingToday.length > 0 && (
        <div className="border-t border-[var(--border-color)] pt-4 pb-24">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
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
                    <p className="text-xs text-[var(--text-secondary)]">{w.position}</p>
                  )}
                </div>
                {w.clock_in ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                    <span className="text-xs text-[var(--brand-primary)]">{t("shift.onShift")}</span>
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">{t("schedule.notArrived")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
