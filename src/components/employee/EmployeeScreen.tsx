"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { ro } from "date-fns/locale";
import {
  getActiveShift,
  getMyShifts,
} from "@/actions/shiftActions";
import { getEmployeeStats } from "@/actions/salaryActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { ScheduleEmployee } from "@/components/employee/ScheduleEmployee";
import { Onboarding } from "@/components/employee/Onboarding";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { hapticImpact, hapticNotification } from "@/lib/haptic";
import { useToast } from "@/store/toastStore";
import { useUserStore } from "@/store/userStore";
import { SHIFT_HISTORY_LIMIT } from "@/lib/constants";
import type { EmployeeStats, Shift } from "@/types/database";

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
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

type PeriodType = "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-[var(--brand-primary)]",
  COMPLETED: "text-[var(--color-success)]",
  AUTO_CLOSED: "text-[var(--color-warning)]",
  REVIEWED: "text-[var(--text-secondary)]",
};

export function EmployeeScreen() {
  const { t, locale, setLocale } = useI18n();
  const user = useUserStore((s) => s.user);
  const show = useToast((s) => s.show);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const dateLocale = locale === "ro" ? ro : ru;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("onboarded");
    }
    return false;
  });
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<PeriodType | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!user) return;

    const initData = useUserStore.getState().initData;
    const [activeResult, , statsResult] = await Promise.all([
      getActiveShift(user.id, initData ?? ""),
      getMyShifts(user.id, undefined, initData ?? ""),
      getEmployeeStats(user.id, initData ?? ""),
    ]);

    if (signal?.aborted) return;
    if (activeResult.success) setActiveShift(activeResult.data ?? null);
    if (statsResult.success && statsResult.data) setStats(statsResult.data);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleToggleShift = () => {
    if (!user) return;
    const action = activeShift ? "clockOut" : "clockIn";
    hapticImpact("medium");

    startTransition(async () => {
      try {
        const res = await fetch("/api/clock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, action, initData: useUserStore.getState().initData }),
        });

        const data = await res.json();

        if (!res.ok) {
          hapticNotification("error");
          show(data.error ?? t("common.operationError"), "error");
          return;
        }

        hapticNotification("success");
        show(action === "clockOut" ? t("shift.closed") : t("shift.opened"), "success");
        void loadData();
      } catch {
        hapticNotification("error");
        show(t("common.networkError"), "error");
      }
    });
  };

  const openShiftHistory = async (period: PeriodType) => {
    if (!user) return;
    hapticImpact("light");
    setHistoryPeriod(period);
    setHistoryLoading(true);

    const now = new Date();
    let from: string;
    let to: string;

    if (period === "week") {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      const we = endOfWeek(now, { weekStartsOn: 1 });
      from = ws.toISOString().split("T")[0]!;
      to = we.toISOString().split("T")[0]!;
    } else {
      const ms = startOfMonth(now);
      const me = endOfMonth(now);
      from = ms.toISOString().split("T")[0]!;
      to = me.toISOString().split("T")[0]!;
    }

    const initData = useUserStore.getState().initData;
    const result = await getMyShifts(user.id, SHIFT_HISTORY_LIMIT, initData ?? "");

    if (result.success && result.data) {
      const filtered = result.data.filter((s) => {
        const d = s.clock_in.split("T")[0]!;
        return d >= from && d <= to;
      });
      setShiftHistory(filtered);
    }

    setHistoryLoading(false);
  };

  const closeShiftHistory = () => {
    hapticImpact("light");
    setHistoryPeriod(null);
    setShiftHistory([]);
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

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-24">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-teal-700 text-sm font-bold text-white shadow-lg shadow-[var(--brand-primary)]/20">
            {user?.full_name ? getInitials(user.full_name) : "—"}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
              {t("employee.hello")}
            </p>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">{user?.full_name}</h1>
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
          {isPending ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : isOnShift ? t("shift.end") : t("shift.start")}
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
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
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
      </div>

      {/* Статистика — кликабельные карточки */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => openShiftHistory("week")}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-left transition-all active:scale-[0.98] hover:border-[var(--brand-primary)]/30"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.thisWeek")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
              {stats.hoursThisWeek.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">
                {t("common.hoursAbbrev")}
              </span>
            </p>
            <p className="mt-1 text-[10px] text-[var(--brand-primary)]">
              {t("employee.viewShifts")}
            </p>
          </button>
          <button
            onClick={() => openShiftHistory("month")}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-left transition-all active:scale-[0.98] hover:border-[var(--brand-primary)]/30"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.thisMonth")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
              {stats.hoursThisMonth.toFixed(1)}
              <span className="ml-1 text-xs font-normal text-[var(--text-secondary)]">
                {t("common.hoursAbbrev")}
              </span>
            </p>
            <p className="mt-1 text-[10px] text-[var(--brand-primary)]">
              {t("employee.viewShifts")}
            </p>
          </button>
          <div className="col-span-2 rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              {t("employee.expectedSalary")}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--brand-primary)]">
              {formatMoney(stats.expectedSalary, locale)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {stats.hourlyRate} {t("common.ratePerHour")} · {t("common.shiftsCount", { count: stats.totalShifts })}
            </p>
          </div>
        </div>
      )}

      <EmployeeSalary />

      <ScheduleEmployee />

      <div className="mt-6">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{t("settings.language")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLocale("ru")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ru" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              {t("lang.ru")}
            </button>
            <button onClick={() => setLocale("ro")} className={`rounded-[1440px] border py-2.5 text-sm font-semibold transition-colors ${locale === "ro" ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border-color)] text-[var(--text-secondary)]"}`}>
              {t("lang.ro")}
            </button>
          </div>
        </div>
      </div>

      {/* Модалка со списком смен */}
      {historyPeriod && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeShiftHistory}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl bg-[var(--bg-app)] p-5 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {historyPeriod === "week" ? t("employee.shiftsThisWeek") : t("employee.shiftsThisMonth")}
              </h2>
              <button onClick={closeShiftHistory} aria-label={t("nav.close")} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : shiftHistory.length === 0 ? (
              <div className="flex min-h-[20vh] flex-col items-center justify-center gap-3">
                <svg className="h-10 w-10 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-[var(--text-secondary)]">{t("employee.noShifts")}</p>
              </div>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {shiftHistory.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {format(new Date(shift.clock_in), "d MMM, EEEE", { locale: dateLocale })}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {format(new Date(shift.clock_in), "HH:mm")}
                          {shift.clock_out && (
                            <> → {format(new Date(shift.clock_out), "HH:mm")}</>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        {shift.hours_worked != null && (
                          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">
                            {shift.hours_worked.toFixed(1)} {t("common.hoursAbbrev")}
                          </p>
                        )}
                        <p className={`text-[10px] font-semibold ${STATUS_COLORS[shift.status] ?? "text-[var(--text-secondary)]"}`}>
                          {t(`shiftEditor.${shift.status === "AUTO_CLOSED" ? "autoClosed" : shift.status.toLowerCase()}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
