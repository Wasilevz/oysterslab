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
  getActiveShift,
  getMyShifts,
} from "@/actions/shiftActions";
import { getEmployeeStats } from "@/actions/salaryActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { ScheduleEmployee } from "@/components/employee/ScheduleEmployee";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EmployeeScreen() {
  const { t } = useI18n();
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
    const action = activeShift ? "clockOut" : "clockIn";

    startTransition(async () => {
      try {
        const res = await fetch("/api/clock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, action, initData: useUserStore.getState().initData }),
        });

        const data = await res.json();

        if (!res.ok) {
          setActionError(data.error ?? t("common.operationError"));
          return;
        }

        setSuccess(action === "clockOut" ? t("shift.closed") : t("shift.opened"));
        void loadData();
      } catch {
        setActionError(t("common.networkError"));
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const isOnShift = Boolean(activeShift);

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-8">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-teal-700 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20">
            {user?.full_name ? getInitials(user.full_name) : "—"}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
              {t("employee.hello")}
            </p>
            <h1 className="text-lg font-bold text-[var(--fg)]">{user?.full_name}</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Карточка смены — главный элемент */}
      <div
        className={`relative mb-5 overflow-hidden rounded-3xl border transition-all duration-300 ${
          isOnShift
            ? "border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/15 via-[var(--accent)]/5 to-transparent shadow-xl shadow-[var(--accent)]/5"
            : "border-[var(--card-border)]/80 bg-[var(--card)]"
        }`}
      >
        <div className="p-5">
          {isOnShift && activeShift ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {t("shift.onShift")}
                </p>
              </div>

              <ShiftTimer
                clockIn={activeShift.clock_in}
                className="font-mono text-5xl font-black tabular-nums tracking-tight text-[var(--fg)]"
              />

              <p className="mt-2 text-xs text-[var(--muted)]">
                {t("shift.started")} {format(new Date(activeShift.clock_in), "HH:mm")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--card-border)]/50">
                <svg
                  className="h-7 w-7 text-[var(--muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--muted)]">
                {t("shift.notStarted")}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("shift.tapToStart")}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleToggleShift}
          disabled={isPending}
          className={`w-full py-4 text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 ${
            isOnShift
              ? "bg-rose-100 text-rose-400 hover:bg-rose-500/25"
              : "bg-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/30"
          }`}
        >
          {isPending ? "..." : isOnShift ? t("shift.end") : t("shift.start")}
        </button>

        {actionError && (
          <p className="px-5 pb-4 text-center text-xs text-rose-400">
            {actionError}
          </p>
        )}
        {success && (
          <p className="px-5 pb-4 text-center text-xs text-[var(--accent)]">
            {success}
          </p>
        )}
      </div>

      {/* Статистика */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--card-border)]/50 bg-[var(--card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              {t("employee.thisWeek")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--fg)]">
              {stats.hoursThisWeek.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                ч
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)]/50 bg-[var(--card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              {t("employee.thisMonth")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--fg)]">
              {stats.hoursThisMonth.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                ч
              </span>
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-[var(--accent)]/10 bg-[var(--accent)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              {t("employee.expectedSalary")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--accent)]">
              {formatMoney(stats.expectedSalary)}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              {stats.hourlyRate} л/ч · {stats.totalShifts} смен
            </p>
          </div>
        </div>
      )}

      {/* График часов за неделю */}
      {stats && stats.weeklyHours.some((d) => d.hours > 0) && (
        <div className="mb-5 rounded-2xl border border-[var(--card-border)]/50 bg-[var(--card)] p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            {t("employee.weeklyHours")}
          </p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={stats.weeklyHours}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="day"
                tick={{ fill: "#52525b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={28}>
                {stats.weeklyHours.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.hours > 0 ? "#3b82f6" : "#27272a"}
                    fillOpacity={entry.hours > 0 ? 0.9 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Последние смены */}
      <section className="mb-5">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          {t("employee.lastShifts")}
        </h2>

        {recentShifts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)]/30 bg-[var(--card)] p-8 text-center">
            <p className="text-xs text-[var(--muted)]">{t("employee.noShifts")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentShifts.map((shift) => {
              const hours =
                shift.hours_worked ??
                (shift.clock_out
                  ? getElapsedSeconds(shift.clock_in, new Date(shift.clock_out)) /
                    3600
                  : 0);

              return (
                <li
                  key={shift.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--card-border)]/30 bg-[var(--card)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-[var(--card-border)]/40 leading-none">
                      <span className="text-[10px] font-bold text-[var(--muted)]">
                        {format(new Date(shift.clock_in), "d", { locale: ru })}
                      </span>
                      <span className="text-[8px] text-[var(--muted)]">
                        {format(new Date(shift.clock_in), "MMM", {
                          locale: ru,
                        })}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--muted)]">
                        {format(new Date(shift.clock_in), "HH:mm")}
                        {shift.clock_out &&
                          ` — ${format(new Date(shift.clock_out), "HH:mm")}`}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {format(new Date(shift.clock_in), "EEEE", {
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--fg)]">
                    {formatHours(hours)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EmployeeSalary />

      <ScheduleEmployee />
    </div>
  );
}
