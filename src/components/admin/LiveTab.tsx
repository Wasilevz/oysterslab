"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import { getElapsedSeconds } from "@/lib/utils";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { ActiveShiftCard } from "@/types/database";

interface LiveTabProps {
  onBack?: () => void;
}

export function LiveTab({ onBack }: LiveTabProps) {
  const { t } = useI18n();
  const [activeShifts, setActiveShifts] = useState<ActiveShiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const result = await getDashboardStats(useUserStore.getState().initData ?? "");
    if (signal?.aborted) return;
    if (result.success && result.data) {
      setActiveShifts(result.data.activeShifts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    const interval = setInterval(() => void loadData(), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [loadData]);

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("nav.shifts")}</h2>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeShifts.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <svg className="h-12 w-12 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-[var(--text-secondary)]">{t("shift.noOneOnShift")}</p>
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
                  isLongShift ? "border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5" : "border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--brand-primary)]" />
                    </span>
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{user.full_name}</p>
                      {user.position && <p className="text-xs font-medium text-[var(--text-secondary)]">{user.position}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <ShiftTimer clockIn={shift.clock_in} className="font-mono text-2xl font-black tabular-nums text-[var(--brand-primary)]" />
                    {isLongShift && <p className="mt-0.5 text-xs font-medium text-amber-400">{hours}+ {t("common.hoursAbbrev")}</p>}
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
