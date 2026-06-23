"use client";

import { useCallback, useEffect, useState } from "react";
import { getMySchedule, getWorkingToday } from "@/actions/scheduleActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { Schedule, ScheduleType } from "@/types/database";

const TYPE_COLORS: Record<ScheduleType, { dot: string; text: string }> = {
  work: { dot: "bg-blue-500", text: "text-blue-400" },
  off: { dot: "bg-zinc-600", text: "text-zinc-500" },
  vacation: { dot: "bg-amber-500", text: "text-amber-400" },
  sick: { dot: "bg-rose-500", text: "text-rose-400" },
};

const TYPE_LABELS: Record<ScheduleType, string> = {
  work: "schedule.work",
  off: "schedule.off",
  vacation: "schedule.vacation",
  sick: "schedule.sick",
};

export function ScheduleEmployee() {
  const { t } = useI18n();
  const user = useUserStore((s) => s.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workingToday, setWorkingToday] = useState<{ id: string; full_name: string; position: string | null; clock_in: string | null }[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const loadData = useCallback(async () => {
    if (!user) return;
    const [schedResult, todayResult] = await Promise.all([
      getMySchedule(user.id, year, month),
      getWorkingToday(),
    ]);
    if (schedResult.success && schedResult.data) setSchedules(schedResult.data);
    if (todayResult.success && todayResult.data) setWorkingToday(todayResult.data);
    setLoading(false);
  }, [user, year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const getDayType = (day: number): ScheduleType => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = schedules.find((s) => s.date === dateStr);
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-24">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          {t("schedule.mySchedule")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {monthNames[month - 1]} {year}
        </h1>
      </header>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex gap-2">
          {(["work", "off", "vacation", "sick"] as const).map((type) => (
            <span key={type} className={`flex items-center gap-1 text-[10px] ${TYPE_COLORS[type].text}`}>
              <span className={`h-2 w-2 rounded-full ${TYPE_COLORS[type].dot}`} />
              {t(TYPE_LABELS[type])}
            </span>
          ))}
        </div>
        <button onClick={nextMonth} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-zinc-500">{d}</div>
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
                  isToday ? "ring-1 ring-blue-500/50" : ""
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? "text-white" : "text-zinc-400"}`}>
                  {day}
                </span>
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              </div>
            );
          })}
        </div>
      </div>

      {workingToday.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            {t("schedule.todayOnShift")}
          </h2>
          <div className="space-y-2">
            {workingToday.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-800/30 bg-zinc-900/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{w.full_name}</p>
                  {w.position && (
                    <p className="text-[10px] text-zinc-500">{w.position}</p>
                  )}
                </div>
                {w.clock_in ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                    <span className="text-[10px] text-blue-400">{t("shift.onShift")}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-600">{t("schedule.notArrived")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
