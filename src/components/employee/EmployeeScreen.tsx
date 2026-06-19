"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  clockIn,
  clockOut,
  getActiveShift,
  getMyShifts,
} from "@/actions/shiftActions";
import { getEmployeeStats } from "@/actions/salaryActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours, getElapsedSeconds } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import type { EmployeeStats, Shift } from "@/types/database";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EmployeeScreen() {
  const user = useUserStore((s) => s.user);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;

    const [activeResult, shiftsResult, statsResult] = await Promise.all([
      getActiveShift(user.id),
      getMyShifts(user.id),
      getEmployeeStats(user.id),
    ]);

    if (activeResult.success) setActiveShift(activeResult.data ?? null);
    if (shiftsResult.success) setRecentShifts(shiftsResult.data ?? []);
    if (statsResult.success && statsResult.data) setStats(statsResult.data);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleToggleShift = () => {
    if (!user) return;

    setActionError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = activeShift
        ? await clockOut(user.id)
        : await clockIn(user.id);

      if (!result.success) {
        setActionError(result.error ?? "Ошибка операции");
        return;
      }

      setSuccess(activeShift ? "Смена завершена" : "Смена начата");
      void loadData();
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const isOnShift = Boolean(activeShift);

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-8">
      <header className="mb-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Привет
        </p>
        <h1 className="mt-0.5 text-xl font-bold text-white">{user?.full_name}</h1>
      </header>

      {/* Статы */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
            <p className="text-[10px] text-zinc-500">На этой неделе</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-white">
              {stats.hoursThisWeek.toFixed(1)} <span className="text-xs font-normal text-zinc-500">ч</span>
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
            <p className="text-[10px] text-zinc-500">За месяц</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-white">
              {stats.hoursThisMonth.toFixed(1)} <span className="text-xs font-normal text-zinc-500">ч</span>
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-3">
            <p className="text-[10px] text-zinc-500">Ожидаемая зарплата</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-blue-400">
              {formatMoney(stats.expectedSalary)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
            <p className="text-[10px] text-zinc-500">Смен</p>
            <p className="mt-0.5 font-mono text-lg font-bold text-white">
              {stats.totalShifts}
            </p>
          </div>
        </div>
      )}

      {/* График часов за неделю */}
      {stats && stats.weeklyHours.some((d) => d.hours > 0) && (
        <div className="mb-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-3">
          <p className="mb-2 text-[10px] text-zinc-500">Часы за неделю</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={stats.weeklyHours} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: "#52525b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {stats.weeklyHours.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.hours > 0 ? "#3b82f6" : "#27272a"}
                    fillOpacity={entry.hours > 0 ? 0.8 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Карточка смены */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-colors ${
          isOnShift
            ? "border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5"
            : "border-zinc-800 bg-zinc-900/30"
        }`}
      >
        <div className="p-4">
          {isOnShift && activeShift ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    На смене
                  </p>
                </div>
                <span className="text-[10px] text-zinc-500">
                  с {format(new Date(activeShift.clock_in), "HH:mm")}
                </span>
              </div>

              <ShiftTimer
                clockIn={activeShift.clock_in}
                className="font-mono text-4xl font-black tabular-nums text-white"
              />
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Смена не начата
                </p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  12:00 — 22:30
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/50">
                <svg className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка — маленькая, внизу карточки */}
        <button
          onClick={handleToggleShift}
          disabled={isPending}
          className={`w-full py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 ${
            isOnShift
              ? "bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
              : "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
          }`}
        >
          {isPending ? "..." : isOnShift ? "Завершить смену" : "Начать смену"}
        </button>

        {actionError && (
          <p className="px-4 pb-3 text-center text-xs text-rose-400">{actionError}</p>
        )}
        {success && (
          <p className="px-4 pb-3 text-center text-xs text-blue-400">{success}</p>
        )}
      </div>

      {/* Последние смены */}
      <section className="mt-5">
        <h2 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Последние смены
        </h2>

        {recentShifts.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/30 bg-zinc-900/20 p-5 text-center">
            <p className="text-xs text-zinc-600">Пока нет смен</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {recentShifts.map((shift) => {
              const hours =
                shift.hours_worked ??
                (shift.clock_out
                  ? getElapsedSeconds(shift.clock_in, new Date(shift.clock_out)) / 3600
                  : 0);

              return (
                <li
                  key={shift.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/30 bg-zinc-900/20 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-col items-center justify-center rounded-lg bg-zinc-800/40 leading-none">
                      <span className="text-[9px] font-bold text-zinc-400">
                        {format(new Date(shift.clock_in), "d", { locale: ru })}
                      </span>
                      <span className="text-[8px] text-zinc-600">
                        {format(new Date(shift.clock_in), "MMM", { locale: ru })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {format(new Date(shift.clock_in), "HH:mm")}
                      {shift.clock_out && ` — ${format(new Date(shift.clock_out), "HH:mm")}`}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-300">
                    {formatHours(hours)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EmployeeSalary />
    </div>
  );
}
