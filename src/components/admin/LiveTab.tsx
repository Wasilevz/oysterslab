"use client";

import { ShiftTimer } from "@/components/shared/ShiftTimer";
import type { ActiveShiftCard } from "@/types/database";

interface LiveTabProps {
  activeShifts: ActiveShiftCard[];
}

export function LiveTab({ activeShifts }: LiveTabProps) {
  if (activeShifts.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-800/50" />
          <p className="text-zinc-500">Сейчас никто не на смене</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-4">
      {activeShifts.map(({ shift, user }) => (
        <article
          key={shift.id}
          className="flex items-center justify-between rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
            <div>
              <p className="text-lg font-bold text-white">{user.full_name}</p>
              {user.position && (
                <p className="text-xs text-zinc-500">{user.position}</p>
              )}
              <p className="text-xs text-zinc-500">На смене</p>
            </div>
          </div>
          <ShiftTimer
            clockIn={shift.clock_in}
            className="font-mono text-2xl font-black tabular-nums text-blue-400"
          />
        </article>
      ))}
    </div>
  );
}
