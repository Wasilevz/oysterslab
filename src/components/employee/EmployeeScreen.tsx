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
    startTransition(async () => {
      const result = activeShift
        ? await clockOut(user.id)
        : await clockIn(user.id);

      if (!result.success) {
        setActionError(result.error ?? "Ошибка операции");
        return;
      }

      await loadData();
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="min-h-[45vh] w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isOnShift = Boolean(activeShift);

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Смена
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">{user?.full_name}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {isOnShift && activeShift ? (
          <div className="text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">
              На смене
            </p>
            <ShiftTimer
              clockIn={activeShift.clock_in}
              className="font-mono text-7xl font-black tabular-nums text-white"
            />
          </div>
        ) : (
          <p className="text-center text-lg text-zinc-500">
            Нажмите, чтобы начать смену
          </p>
        )}

        <Button
          variant={isOnShift ? "rose" : "blue"}
          size="xl"
          disabled={isPending}
          onClick={handleToggleShift}
        >
          {isPending
            ? "..."
            : isOnShift
              ? "Завершить"
              : "Начать смену"}
        </Button>

        {actionError && (
          <p className="text-center text-sm text-rose-400">{actionError}</p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Последние смены
        </h2>

        {recentShifts.length === 0 ? (
          <p className="text-sm text-zinc-600">Пока нет завершённых смен</p>
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
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-200">
                      {format(new Date(shift.clock_in), "d MMM", { locale: ru })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(shift.clock_in), "HH:mm")}
                      {shift.clock_out &&
                        ` — ${format(new Date(shift.clock_out), "HH:mm")}`}
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold text-zinc-300">
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
