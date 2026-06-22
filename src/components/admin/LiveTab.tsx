"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { getElapsedSeconds } from "@/lib/utils";
import type { ActiveShiftCard } from "@/types/database";

interface LiveTabProps {
  activeShifts: ActiveShiftCard[];
}

export function LiveTab({ activeShifts }: LiveTabProps) {
  if (activeShifts.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Сейчас никто не на смене</p>
          <p className="mt-1 text-xs text-zinc-600">Все сотрудники свободны</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-4">
      {activeShifts.map(({ shift, user }) => {
        const elapsed = getElapsedSeconds(shift.clock_in);
        const hours = Math.floor(elapsed / 3600);
        const isLongShift = hours >= 10;

        return (
          <article
            key={shift.id}
            className={`rounded-2xl border p-4 ${
              isLongShift
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-blue-500/10 bg-blue-500/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
                </span>
                <div>
                  <p className="text-lg font-bold text-white">{user.full_name}</p>
                  {user.position && (
                    <p className="text-xs font-medium text-zinc-400">{user.position}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    Начало в {format(new Date(shift.clock_in), "HH:mm", { locale: ru })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <ShiftTimer
                  clockIn={shift.clock_in}
                  className="font-mono text-2xl font-black tabular-nums text-blue-400"
                />
                {isLongShift && (
                  <p className="mt-0.5 text-[10px] font-medium text-amber-400">
                    {hours}+ ч
                  </p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
