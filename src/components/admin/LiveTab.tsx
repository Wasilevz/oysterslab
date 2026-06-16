"use client";

import { ShiftTimer } from "@/components/shared/ShiftTimer";
import type { ActiveShiftCard } from "@/types/database";

interface LiveTabProps {
  activeShifts: ActiveShiftCard[];
}

export function LiveTab({ activeShifts }: LiveTabProps) {
  if (activeShifts.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-zinc-500">Сейчас никто не на смене</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-4 pt-4">
      {activeShifts.map(({ shift, user }) => (
        <article
          key={shift.id}
          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              aria-hidden
            />
            <div>
              <p className="text-lg font-bold text-white">{user.full_name}</p>
              <p className="text-xs text-zinc-500">На смене</p>
            </div>
          </div>
          <ShiftTimer
            clockIn={shift.clock_in}
            className="font-mono text-2xl font-black tabular-nums text-emerald-400"
          />
        </article>
      ))}
    </div>
  );
}
