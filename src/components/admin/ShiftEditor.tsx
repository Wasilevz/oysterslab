"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ro } from "date-fns/locale";
import { getAllShifts, editShift, deleteShift } from "@/actions/shiftActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { Shift } from "@/types/database";

type ShiftWithUser = Shift & { users: { full_name: string; position: string | null } };

const STATUS_KEYS: Record<string, string> = {
  ACTIVE: "shiftEditor.active",
  COMPLETED: "shiftEditor.completed",
  AUTO_CLOSED: "shiftEditor.autoClosed",
  REVIEWED: "shiftEditor.reviewed",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-[var(--brand-primary)]",
  COMPLETED: "text-[var(--color-success)]",
  AUTO_CLOSED: "text-[var(--color-warning)]",
  REVIEWED: "text-[var(--text-secondary)]",
};

export function ShiftEditor({ onBack }: { onBack?: () => void }) {
  const { t, locale } = useI18n();
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dateLocale = locale === "ro" ? ro : ru;

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    const result = await getAllShifts(dateFrom, dateTo, useUserStore.getState().initData ?? "");
    if (result.success && result.data) setShifts(result.data);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void loadData();
  }, [loadData]);

  const startEdit = (shift: ShiftWithUser) => {
    setEditingId(shift.id);
    setEditClockIn(formatDatetimeLocal(shift.clock_in));
    setEditClockOut(shift.clock_out ? formatDatetimeLocal(shift.clock_out) : "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditClockIn("");
    setEditClockOut("");
    setError(null);
  };

  const handleSave = () => {
    if (!editingId) return;
    if (!editClockIn) {
      setError(t("shiftEditor.enterStartTime"));
      return;
    }

    startTransition(async () => {
      const result = await editShift(
        editingId,
        editClockIn,
        editClockOut || null,
        useUserStore.getState().initData ?? "",
      );
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      cancelEdit();
      void loadData();
    });
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="mb-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} aria-label={t("common.back")} className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{t("shiftEditor.title")}</h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.from")}</p>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.to")}</p>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 px-4 py-3">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : shifts.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
          <svg className="h-12 w-12 text-[var(--text-secondary)]/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">{t("shiftEditor.noShifts")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const statusKey = STATUS_KEYS[shift.status] ?? null;
            const statusColor = STATUS_COLORS[shift.status] ?? "text-[var(--text-secondary)]";
            const isEditing = editingId === shift.id;

  const handleDelete = (id: string) => {
    if (!window.confirm(t("common.confirm"))) return;
    startTransition(async () => {
      const result = await deleteShift(id, useUserStore.getState().initData ?? "");
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      void loadData();
    });
  };

  return (
              <div
                key={shift.id}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{shift.users.full_name}</p>
                    {shift.users.position && (
                      <p className="text-xs text-[var(--text-secondary)]">{shift.users.position}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {format(new Date(shift.clock_in), "d MMM, HH:mm", { locale: dateLocale })}
                      {shift.clock_out && (
                        <> → {format(new Date(shift.clock_out), "HH:mm", { locale: dateLocale })}</>
                      )}
                    </p>
                    {shift.hours_worked != null && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {shift.hours_worked.toFixed(1)} {t("common.hoursAbbrev")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${statusColor}`}>
                      {statusKey ? t(statusKey) : shift.status}
                    </span>
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => startEdit(shift)}
                          aria-label={t("settings.edit")}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          aria-label={t("common.delete")}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-red-500/30 hover:text-red-500"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.342-.052.682-.107 1.022-.166m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3">
                    <div>
                      <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("shiftEditor.clockIn")}</p>
                      <input
                        type="datetime-local"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("shiftEditor.clockOut")}</p>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {t("shiftEditor.clockOutHint")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1" onClick={cancelEdit} disabled={isPending}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="blue" className="flex-1" onClick={handleSave} disabled={isPending}>
                        {isPending ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : t("common.save")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
