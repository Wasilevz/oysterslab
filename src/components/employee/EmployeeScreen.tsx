"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  clockIn,
  clockOut,
  getActiveShift,
  getMyShifts,
} from "@/actions/shiftActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { Button } from "@/components/ui/button";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHours, getElapsedSeconds } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import type { Shift } from "@/types/database";

export function EmployeeScreen() {
  const user = useUserStore((s) => s.user);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;

    const [activeResult, shiftsResult] = await Promise.all([
      getActiveShift(user.id),
      getMyShifts(user.id),
    ]);

    if (activeResult.success) {
      setActiveShift(activeResult.data ?? null);
    }

    if (shiftsResult.success) {
      setRecentShifts(shiftsResult.data ?? []);
    }

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
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const isOnShift = Boolean(activeShift);

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-8">
      <header className="mb-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Привет
        </p>
        <h1 className="mt-0.5 text-xl font-bold text-white">{user?.full_name}</h1>
      </header>

      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${
          isOnShift
            ? "border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5"
            : "border-zinc-800 bg-zinc-900/30"
        }`}
      >
        {isOnShift && activeShift ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                На смене
              </p>
            </div>

            <ShiftTimer
              clockIn={activeShift.clock_in}
              className="font-mono text-5xl font-black tabular-nums text-white"
            />

            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
              <span>
                Начало:{" "}
                <span className="text-zinc-300">
                  {format(new Date(activeShift.clock_in), "HH:mm", { locale: ru })}
                </span>
              </span>
              <span className="text-zinc-700">•</span>
              <span>
                График: <span className="text-zinc-300">12:00 — 22:30</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Смена не начата
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Начало в 12:00 · окончание в 22:30
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Не забудь нажать кнопку после начала смены</span>
            </div>
          </>
        )}

        <Button
          variant={isOnShift ? "rose" : "blue"}
          className="mt-5 w-full"
          size="lg"
          disabled={isPending}
          onClick={handleToggleShift}
        >
          {isPending
            ? "..."
            : isOnShift
              ? "Завершить смену"
              : "Начать смену"}
        </Button>

        {actionError && (
          <p className="mt-3 text-center text-sm text-rose-400">{actionError}</p>
        )}
        {success && (
          <p className="mt-3 text-center text-sm text-blue-400">{success}</p>
        )}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Последние смены
        </h2>

        {recentShifts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
            <p className="text-sm text-zinc-600">Пока нет завершённых смен</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
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
                  className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/20 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/50 text-[10px] font-bold text-zinc-400">
                      {format(new Date(shift.clock_in), "d\nMMM", { locale: ru }).split("\n").map((line, i) => (
                        <span key={i} className="block leading-tight">{line}</span>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {format(new Date(shift.clock_in), "HH:mm", { locale: ru })}
                        {shift.clock_out &&
                          ` — ${format(new Date(shift.clock_out), "HH:mm")}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-zinc-300">
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
