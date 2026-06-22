"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
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
import type { ShiftWithUser } from "@/types/database";

interface ForgottenTabProps {
  shifts: ShiftWithUser[];
  onReviewed: () => void;
}

export function ForgottenTab({ shifts, onReviewed }: ForgottenTabProps) {
  const [selected, setSelected] = useState<ShiftWithUser | null>(null);
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      setError("Введите число часов");
      return;
    }

    startTransition(async () => {
      const result = await reviewAutoClosedShift(selected.id, parsed);

      if (!result.success) {
        setError(result.error ?? "Ошибка сохранения");
        return;
      }

      closeDialog();
      onReviewed();
    });
  };

  if (shifts.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Забытых смен нет</p>
          <p className="mt-1 text-xs text-zinc-600">Все сотрудники закрыли смены</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 mb-3">
        <p className="text-xs text-zinc-500">
          Система автоматически закрыла смены после 1:30. Проверьте часы и подтвердите.
        </p>
      </div>

      <div className="grid gap-3 px-4">
        {shifts.map((shift) => (
          <article
            key={shift.id}
            className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">
                  {shift.users.full_name}
                </p>
                {shift.users.position && (
                  <p className="text-xs text-zinc-500">{shift.users.position}</p>
                )}
                <p className="text-sm text-zinc-400">
                  {format(new Date(shift.clock_in), "d MMMM, HH:mm", {
                    locale: ru,
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  AUTO
                </span>
                {shift.hours_worked != null && (
                  <p className="mt-1 font-mono text-xs font-bold text-amber-400">
                    ≈ {shift.hours_worked.toFixed(1)} ч
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDialog(shift)}
            >
              Проверить и подтвердить
            </Button>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отработанные часы</DialogTitle>
            <DialogDescription>
              {selected?.users.full_name} — смена от{" "}
              {selected &&
                format(new Date(selected.clock_in), "d MMM yyyy", {
                  locale: ru,
                })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              max="24"
              placeholder="8"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              autoFocus
            />
            {selected?.hours_worked != null && (
              <p className="text-xs text-zinc-500">
                Система рассчитала: {selected.hours_worked.toFixed(1)} ч
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isPending}>
              Отмена
            </Button>
            <Button
              variant="blue"
              onClick={handleSubmit}
              disabled={isPending || !hours}
            >
              {isPending ? "Сохранение..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
