"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
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
  const { t } = useI18n();
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ShiftWithUser | null>(null);
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    const initData = useUserStore.getState().initData ?? "";
    const result = await getDashboardStats(initData);
    if (result.success && result.data) {
      setShifts(result.data.autoClosedShifts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
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
            <button onClick={onBack} aria-label="Назад" className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("nav.forgotten")}</h2>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("common.loading")}</p>
        ) : shifts.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
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
                        {format(new Date(shift.clock_in), "d MMMM, HH:mm", { locale: ru })}
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
              {selected?.users.full_name} — смена от{" "}
              {selected && format(new Date(selected.clock_in), "d MMM yyyy", { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input type="number" inputMode="decimal" step="0.5" min="0.5" max="24" placeholder="8" value={hours} onChange={(e) => setHours(e.target.value)} autoFocus />
            {selected?.hours_worked != null && (
              <p className="text-xs text-[var(--text-secondary)]">{t("shift.systemCalculated")} {selected.hours_worked.toFixed(1)} ч</p>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isPending}>{t("common.cancel")}</Button>
            <Button variant="blue" onClick={handleSubmit} disabled={isPending || !hours}>
              {isPending ? "..." : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
