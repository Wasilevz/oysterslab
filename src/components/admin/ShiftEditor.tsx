"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getAllShifts, editShift } from "@/actions/shiftActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ACTIVE: "text-blue-400",
  COMPLETED: "text-emerald-400",
  AUTO_CLOSED: "text-amber-400",
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
          <button onClick={onBack} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-bold text-white">{t("shiftEditor.title")}</h2>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-xs text-zinc-500">{t("salary.from")}</p>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">{t("salary.to")}</p>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : shifts.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-zinc-500">{t("shiftEditor.noShifts")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const statusKey = STATUS_KEYS[shift.status] ?? null;
            const statusColor = STATUS_COLORS[shift.status] ?? "text-zinc-500";
            const isEditing = editingId === shift.id;

            return (
              <div
                key={shift.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">{shift.users.full_name}</p>
                    {shift.users.position && (
                      <p className="text-[10px] text-zinc-500">{shift.users.position}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      {format(new Date(shift.clock_in), "d MMM, HH:mm", { locale: ru })}
                      {shift.clock_out && (
                        <> → {format(new Date(shift.clock_out), "HH:mm", { locale: ru })}</>
                      )}
                    </p>
                    {shift.hours_worked != null && (
                      <p className="text-[10px] text-zinc-500">
                        {shift.hours_worked.toFixed(1)} ч
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
                        className="rounded-lg border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:border-blue-500/30 hover:text-blue-400"
                      >
                        ✎
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-500">{t("shiftEditor.clockIn")}</p>
                      <input
                        type="datetime-local"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-500">{t("shiftEditor.clockOut")}</p>
                      <input
                        type="datetime-local"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      />
                      <p className="mt-0.5 text-[10px] text-zinc-600">
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
