"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  getActiveShift,
  getMyShifts,
} from "@/actions/shiftActions";
import { getEmployeeStats } from "@/actions/salaryActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { ScheduleEmployee } from "@/components/employee/ScheduleEmployee";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
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
  const { t, locale, setLocale } = useI18n();
  const user = useUserStore((s) => s.user);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;

    const initData = useUserStore.getState().initData;
    const [activeResult, , statsResult] = await Promise.all([
      getActiveShift(user.id, initData ?? ""),
      getMyShifts(user.id, undefined, initData ?? ""),
      getEmployeeStats(user.id, initData ?? ""),
    ]);

    if (activeResult.success) setActiveShift(activeResult.data ?? null);
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
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
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
    <div className="flex min-h-full flex-1 flex-col p-4 pb-24">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-teal-700 text-sm font-bold text-white shadow-lg shadow-[var(--brand-primary)]/20">
            {user?.full_name ? getInitials(user.full_name) : "—"}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest dark:text-zinc-600 text-zinc-400">
              {t("employee.hello")}
            </p>
            <h1 className="text-lg font-bold dark:text-white text-zinc-900">{user?.full_name}</h1>
          </div>
        </div>
        <button
          onClick={handleToggleShift}
          disabled={isPending}
          className={`rounded-[1440px] px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 ${
            isOnShift
              ? "bg-[var(--color-error)]/15 text-[var(--color-error)] hover:bg-[var(--color-error)]/25"
              : "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25"
          }`}
        >
          {isPending ? "..." : isOnShift ? t("shift.end") : t("shift.start")}
        </button>
      </header>

      {/* Карточка смены — главный элемент */}
      <div
        className={`relative mb-5 overflow-hidden rounded-3xl border transition-all duration-300 ${
          isOnShift
            ? "border-[var(--brand-primary)]/30 bg-gradient-to-br from-[var(--brand-primary)]/15 via-[var(--brand-primary)]/5 to-transparent shadow-xl shadow-[var(--brand-primary)]/5"
            : "border-[var(--border-color)] bg-[var(--bg-surface)]"
        }`}
      >
        <div className="p-5">
          {isOnShift && activeShift ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
                  {t("shift.onShift")}
                </p>
              </div>

              <ShiftTimer
                clockIn={activeShift.clock_in}
                className="font-mono text-5xl font-black tabular-nums tracking-tight text-[var(--text-primary)]"
              />

              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {t("shift.started")} {format(new Date(activeShift.clock_in), "HH:mm")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                {t("shift.notStarted")}
              </p>
            </div>
          )}
        </div>

        {actionError && (
          <p className="px-5 pb-4 text-center text-xs text-rose-400">
            {actionError}
          </p>
        )}
        {success && (
          <p className="px-5 pb-4 text-center text-xs text-[var(--brand-primary)]">
            {success}
          </p>
        )}
      </div>

      {/* Статистика */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.thisWeek")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
              {stats.hoursThisWeek.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">
                ч
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.thisMonth")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
              {stats.hoursThisMonth.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">
                ч
              </span>
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.expectedSalary")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--brand-primary)]">
              {formatMoney(stats.expectedSalary)}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {stats.hourlyRate} л/ч · {stats.totalShifts} смен
            </p>
          </div>
        </div>
      )}

      <EmployeeSalary />

      <ScheduleEmployee />

      <div className="mt-6">
        <div className="rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{t("settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLocale("ru")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ru" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              🇷🇺 Русский
            </button>
            <button onClick={() => setLocale("ro")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ro" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              🇲🇩 Română
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
