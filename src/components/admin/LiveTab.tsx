"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { useI18n } from "@/lib/i18n";
import { getElapsedSeconds } from "@/lib/utils";
import type { ActiveShiftCard } from "@/types/database";

interface LiveTabProps {
  onBack?: () => void;
}

export function LiveTab({ onBack }: LiveTabProps) {
  const { t } = useI18n();
  const [activeShifts, setActiveShifts] = useState<ActiveShiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const result = await getDashboardStats();
    if (result.success && result.data) {
      setActiveShifts(result.data.activeShifts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    const interval = setInterval(() => void loadData(), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="rounded-xl p-2 dark:text-[#94A3B8] text-[#718096] dark:hover:bg-[#334155] hover:bg-[#F1F5F9] dark:hover:text-[#F8FAFC] hover:text-[#2D3748]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-bold dark:text-[#F8FAFC] text-[#2D3748]">{t("nav.shifts")}</h2>
      </div>

      {loading ? (
        <p className="text-sm dark:text-[#64748B] text-[#718096]">{t("common.loading")}</p>
      ) : activeShifts.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm font-medium dark:text-[#94A3B8] text-[#718096]">{t("shift.noOneOnShift")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activeShifts.map(({ shift, user }) => {
            const elapsed = getElapsedSeconds(shift.clock_in);
            const hours = Math.floor(elapsed / 3600);
            const isLongShift = hours >= 10;

            return (
              <article
                key={shift.id}
                className={`rounded-2xl border p-4 ${
                  isLongShift ? "border-amber-500/20 dark:bg-amber-500/5 bg-amber-50" : "border-[#008080]/10 dark:bg-[#D6BC97]/5 bg-[#E6F7F7]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#008080] opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[#008080]" />
                    </span>
                    <div>
                      <p className="text-lg font-bold dark:text-[#F8FAFC] text-[#2D3748]">{user.full_name}</p>
                      {user.position && <p className="text-xs font-medium dark:text-[#94A3B8] text-[#718096]">{user.position}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <ShiftTimer clockIn={shift.clock_in} className="font-mono text-2xl font-black tabular-nums text-[#008080]" />
                    {isLongShift && <p className="mt-0.5 text-[10px] font-medium text-amber-400">{hours}+ ч</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
