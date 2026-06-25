"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ro } from "date-fns/locale";
import { getDashboardStats } from "@/actions/adminActions";
import { reviewAutoClosedShift } from "@/actions/shiftActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { ShiftWithUser } from "@/types/database";

interface ForgottenTabProps {
  onReviewed?: () => void;
  onBack?: () => void;
}

export function ForgottenTab({ onReviewed, onBack }: ForgottenTabProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ro" ? ro : ru;
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ShiftWithUser | null>(null);
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const initData = useUserStore.getState().initData ?? "";
    const result = await getDashboardStats(initData);
    if (signal?.aborted) return;
    if (result.success && result.data) {
      setShifts(result.data.autoClosedShifts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const openDialog = (shift: ShiftWithUser) => {
    setSelected(shift);
    setHours(shift.hours_worked?.toFixed(1) ?? "");
    setError(null);
  };

  const closeDialog = () => {
    setSelected(null);
    setHours("");
    setError(null);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const parsed = Number(hours.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setError(t("forgotten.enterHours"));
      return;
    }
    startTransition(async () => {
      const result = await reviewAutoClosedShift(selected.id, parsed, useUserStore.getState().initData ?? "");
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      closeDialog();
      void loadData();
      onReviewed?.();
    });
  };

  return (
    <>
      <div className="px-4 pt-4 pb-8">
        <div className="mb-4 flex items-center gap-3">
          {onBack && (
          <button onClick={onBack} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          )}
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("nav.forgotten")}</h2>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-[var(--bg-surface)]" />
            ))}
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
            <svg className="h-12 w-12 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{t("shift.forgotten")}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-[var(--text-secondary)]">
              {t("shift.forgottenDesc")}
            </p>
            <div className="grid gap-3">
              {shifts.map((shift) => (
                <article key={shift.id} className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[var(--text-primary)]">{shift.users.full_name}</p>
                      {shift.users.position && <p className="text-xs text-[var(--text-secondary)]">{shift.users.position}</p>}
                      <p className="text-sm text-[var(--text-secondary)]">
                        {format(new Date(shift.clock_in), "d MMMM, HH:mm", { locale: dateLocale })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">{t("shift.autoClosed")}</span>
                      {shift.hours_worked != null && (
                        <p className="mt-1 font-mono text-xs font-bold text-amber-400">{t("shift.estimated", { hours: shift.hours_worked.toFixed(1) })}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => openDialog(shift)}>
                    {t("shift.review")}
                  </Button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shift.confirmHours")}</DialogTitle>
            <DialogDescription>
              {selected?.users.full_name} — {t("common.shiftFrom")}{" "}
              {selected && format(new Date(selected.clock_in), "d MMM yyyy", { locale: dateLocale })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input type="number" inputMode="decimal" step="0.5" min="0.5" max="24" placeholder="8" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
            {selected?.hours_worked != null && (
              <p className="text-xs text-[var(--text-secondary)]">{t("shift.systemCalculated")} {selected.hours_worked.toFixed(1)} {t("common.hoursAbbrev")}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isPending}>{t("common.cancel")}</Button>
            <Button variant="blue" onClick={handleSubmit} disabled={isPending || !hours}>
              {isPending ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
