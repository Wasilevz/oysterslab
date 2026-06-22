"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getSchedule, setScheduleDay, setBulkWeekends } from "@/actions/scheduleActions";
import { getEmployees } from "@/actions/employeeActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Schedule, ScheduleType, User } from "@/types/database";

const TYPE_COLORS: Record<ScheduleType, { bg: string; text: string; label: string }> = {
  work: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Рабочий" },
  off: { bg: "bg-zinc-700/30", text: "text-zinc-500", label: "Выходной" },
  vacation: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Отпуск" },
  sick: { bg: "bg-rose-500/20", text: "text-rose-400", label: "Больничный" },
};

const TYPE_ORDER: ScheduleType[] = ["work", "off", "vacation", "sick"];

export function ScheduleAdmin() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const loadData = useCallback(async () => {
    const [schedResult, empResult] = await Promise.all([
      getSchedule(year, month),
      getEmployees(),
    ]);
    if (schedResult.success && schedResult.data) setSchedules(schedResult.data);
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void loadData();
  }, [loadData]);

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

    startTransition(async () => {
      await setScheduleDay(userId, dateStr, next);
    });
  };

  const handleSetWeekends = () => {
    startTransition(async () => {
      await setBulkWeekends(year, month, "off");
      void loadData();
    });
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
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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
      <header className="border-b border-zinc-800/60 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Расписание
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">График сотрудников</h1>
      </header>

      <div className="mt-4 px-4">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <p className="text-lg font-bold text-white">
            {monthNames[month - 1]} {year}
          </p>
          <button onClick={nextMonth} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-1.5">
          {TYPE_ORDER.map((t) => (
            <span key={t} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${TYPE_COLORS[t].bg} ${TYPE_COLORS[t].text}`}>
              {TYPE_COLORS[t].label}
            </span>
          ))}
        </div>

        <Button
          variant="ghost"
          className="mt-3 w-full"
          disabled={isPending}
          onClick={handleSetWeekends}
        >
          {isPending ? "..." : "Установить выходные (сб/вс) всем"}
        </Button>
      </div>

      <div className="mt-4 flex-1 overflow-x-auto px-4 pb-24">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-950 p-1 text-left text-[10px] font-medium text-zinc-500">
                Сотрудник
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = new Date(year, month - 1, day);
                const dow = (date.getDay() + 6) % 7;
                const isWeekend = dow >= 5;
                return (
                  <th
                    key={day}
                    className={`p-1 text-center text-[10px] font-medium ${isWeekend ? "text-zinc-600" : "text-zinc-500"}`}
                  >
                    <div>{day}</div>
                    <div className="text-[8px]">{dayLabels[dow]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="sticky left-0 z-10 bg-zinc-950 py-1 pr-2">
                  <p className="truncate text-xs font-medium text-white">{emp.full_name}</p>
                  {emp.position && (
                    <p className="truncate text-[8px] text-zinc-500">{emp.position}</p>
                  )}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const type = getScheduleType(emp.id, day);
                  const colors = TYPE_COLORS[type];
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        onClick={() => cycleType(emp.id, day)}
                        className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-colors ${colors.bg} ${colors.text}`}
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
    </div>
  );
}
