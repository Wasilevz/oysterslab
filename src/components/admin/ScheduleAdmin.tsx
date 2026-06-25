"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getSchedule, setScheduleDay, getWorkingToday } from "@/actions/scheduleActions";
import { getEmployees } from "@/actions/employeeActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import { hapticImpact } from "@/lib/haptic";
import { TYPE_COLORS } from "@/lib/schedule-constants";
import type { Schedule, ScheduleType, User } from "@/types/database";

const TYPE_ORDER: ScheduleType[] = ["work", "off", "vacation", "sick"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleAdmin({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const initData = useUserStore((s) => s.initData);
  const [employees, setEmployees] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDays(weekStart);
  const touchStartX = useRef(0);

  const loadScheduleForWeek = useCallback(async (ws: Date) => {
    const endOfMonth = new Date(ws.getFullYear(), ws.getMonth() + 1, 0);
    const startOfMonth = new Date(ws.getFullYear(), ws.getMonth(), 1);
    const fetchStart = ws < startOfMonth ? startOfMonth : ws;
    const fetchEnd = new Date(ws);
    fetchEnd.setDate(fetchEnd.getDate() + 6);
    const actualEnd = fetchEnd > endOfMonth ? endOfMonth : fetchEnd;

    const schedResult = await getSchedule(
      fetchStart.getFullYear(),
      fetchStart.getMonth() + 1,
      initData ?? "",
    );
    if (schedResult.success && schedResult.data) {
      const weekDates = weekDays.map(toDateStr);
      setSchedules(schedResult.data.filter((s) => weekDates.includes(s.date)));
    }
  }, [initData]);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const [empResult, todayResult] = await Promise.all([
      getEmployees(initData ?? ""),
      getWorkingToday(initData ?? ""),
    ]);
    if (signal?.aborted) return;
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    if (todayResult.success && todayResult.data) setWorkingToday(todayResult.data);
    await loadScheduleForWeek(weekStart);
    setLoading(false);
  }, [weekStart, initData, loadScheduleForWeek]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const getScheduleType = (userId: string, date: Date): ScheduleType => {
    const dateStr = toDateStr(date);
    const entry = schedules.find((s) => s.user_id === userId && s.date === dateStr);
    return entry?.type ?? "work";
  };

  const cycleType = (userId: string, date: Date) => {
    hapticImpact("light");
    const current = getScheduleType(userId, date);
    const idx = TYPE_ORDER.indexOf(current);
    const next = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length];
    const dateStr = toDateStr(date);

    setSchedules((prev) => {
      const filtered = prev.filter((s) => !(s.user_id === userId && s.date === dateStr));
      return [...filtered, { id: "temp", user_id: userId, date: dateStr, type: next, created_at: "" }];
    });

    void setScheduleDay(userId, dateStr, next, initData ?? "");
  };

  const prevWeek = () => {
    hapticImpact("light");
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    hapticImpact("light");
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => {
    hapticImpact("light");
    setWeekStart(getWeekStart(new Date()));
  };

  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const dayLabels = [t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat"), t("day.sun")];
  const today = new Date();
  const todayStr = toDateStr(today);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 80) {
      if (diff > 0) prevWeek();
      else nextWeek();
    }
  };

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
            <button onClick={onBack} aria-label={t("common.back")} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
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
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {format(weekDays[0], "d MMM", { locale: ru })} – {format(weekDays[6], "d MMM", { locale: ru })}
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
      </div>

      <div
        className="mt-3 flex-1 px-4 pb-24"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
                        {dayLabels[i]}
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
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-[var(--border-color)]">
                  <td className="sticky left-0 z-20 bg-[var(--bg-surface)] py-2 pr-2 min-w-[90px]">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{emp.full_name}</p>
                    {emp.position && (
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{emp.position}</p>
                    )}
                  </td>
                  {weekDays.map((day, i) => {
                    const type = getScheduleType(emp.id, day);
                    const colors = TYPE_COLORS[type];
                    const isToday = toDateStr(day) === todayStr;
                    return (
                      <td key={i} className="p-0.5">
                        <button
                          onClick={() => cycleType(emp.id, day)}
                          className={`h-10 w-full rounded-xl text-xs font-bold transition-all active:scale-95 ${colors.bg} ${colors.text} ${isToday ? "ring-1 ring-[var(--brand-primary)]/30" : ""}`}
                        >
                          {type === "work" ? t("schedule.abbrWork") : type === "off" ? t("schedule.abbrOff") : type === "vacation" ? t("schedule.abbrVacation") : t("schedule.abbrSick")}
                        </button>
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
        <div className="border-t border-[var(--border-color)] px-4 pt-4 pb-24">
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
