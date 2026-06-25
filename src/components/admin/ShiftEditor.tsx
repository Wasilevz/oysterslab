"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getAllShifts, editShift } from "@/actions/shiftActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
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
  REVIEWED: "text-violet-400",
};

export function ShiftEditor({ onBack }: { onBack?: () => void }) {
  const { t } = useI18n();
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    const result = await getAllShifts(dateFrom, dateTo);
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
          <button onClick={onBack} className="rounded-[12px] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
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
            className="w-full rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.to")}</p>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-[12px] border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-[16px]" />
      ) : shifts.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-[var(--text-secondary)]">{t("shiftEditor.noShifts")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const statusKey = STATUS_KEYS[shift.status] ?? null;
            const statusColor = STATUS_COLORS[shift.status] ?? "text-[var(--text-secondary)]";
            const isEditing = editingId === shift.id;

            return (
              <div
                key={shift.id}
                className="rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{shift.users.full_name}</p>
                    {shift.users.position && (
                      <p className="text-[10px] text-[var(--text-secondary)]">{shift.users.position}</p>
                    )}
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {format(new Date(shift.clock_in), "d MMM, HH:mm", { locale: ru })}
                      {shift.clock_out && (
                        <> â†’ {format(new Date(shift.clock_out), "HH:mm", { locale: ru })}</>
                      )}
                    </p>
                    {shift.hours_worked != null && (
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {shift.hours_worked.toFixed(1)} Ñ‡
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold ${statusColor}`}>
                      {statusKey ? t(statusKey) : shift.status}
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(shift)}
                        className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]"
                      >
                        âœŽ
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-color)] pt-3">
                    <div>
                      <p className="mb-1 text-[10px] text-[var(--text-secondary)]">{t("shiftEditor.clockIn")}</p>
                      <input
                        type="datetime-local"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                        className="w-full rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-[var(--text-secondary)]">{t("shiftEditor.clockOut")}</p>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="w-full rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                      />
                      <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                        {t("shiftEditor.clockOutHint")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1" onClick={cancelEdit} disabled={isPending}>
                        {t("common.cancel")}
                      </Button>
                      <Button variant="blue" className="flex-1" onClick={handleSave} disabled={isPending}>
                        {isPending ? "..." : t("common.save")}
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
