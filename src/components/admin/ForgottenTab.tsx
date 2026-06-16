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
    setHours("");
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
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-zinc-500">Забытых смен нет</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 px-4 pt-4">
        {shifts.map((shift) => (
          <article
            key={shift.id}
            className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">
                  {shift.users.full_name}
                </p>
                <p className="text-sm text-zinc-400">
                  {format(new Date(shift.clock_in), "d MMMM yyyy, HH:mm", {
                    locale: ru,
                  })}
                </p>
              </div>
              <span className="rounded-lg bg-amber-900/40 px-2 py-1 text-xs font-semibold text-amber-300">
                AUTO
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openDialog(shift)}
            >
              Указать часы
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

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isPending}>
              Отмена
            </Button>
            <Button
              variant="emerald"
              onClick={handleSubmit}
              disabled={isPending || !hours}
            >
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
