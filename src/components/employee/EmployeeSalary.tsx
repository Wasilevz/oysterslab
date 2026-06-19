"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  confirmSalaryReceived,
  getEmployeeSalaries,
} from "@/actions/salaryActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/userStore";
import type { SalaryPayment } from "@/types/database";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EmployeeSalary() {
  const user = useUserStore((s) => s.user);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;
    const result = await getEmployeeSalaries(user.id);
    if (result.success && result.data) {
      setPayments(result.data);
    } else {
      setError(result.error ?? "Ошибка загрузки");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleConfirm = (id: string) => {
    startTransition(async () => {
      const result = await confirmSalaryReceived(id);
      if (!result.success) {
        setError(result.error ?? "Ошибка подтверждения");
        return;
      }
      void loadData();
    });
  };

  if (loading) {
    return (
      <section className="mt-6">
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </section>
    );
  }

  if (payments.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Зарплата
      </h2>

      {error && (
        <p className="mb-2 text-sm text-red-400">{error}</p>
      )}

      <ul className="space-y-2">
        {payments.map((p) => (
          <li
            key={p.id}
            className={`rounded-2xl border p-4 ${
              p.status === "paid"
                ? "border-emerald-500/10 bg-emerald-500/5"
                : p.status === "approved"
                  ? "border-blue-500/10 bg-blue-500/5"
                  : "border-zinc-800 bg-zinc-900/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  {format(new Date(p.period_start), "d MMM", { locale: ru })}
                  {" — "}
                  {format(new Date(p.period_end), "d MMM", { locale: ru })}
                </p>
              </div>
              {p.status === "paid" ? (
                <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  ПОЛУЧЕНО
                </span>
              ) : p.status === "approved" ? (
                <span className="rounded-lg bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                  ОДОБРЕНО
                </span>
              ) : (
                <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  ОЖИДАЕТ
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="flex gap-3 text-xs text-zinc-400">
                <span>{Number(p.hours_worked).toFixed(1)} ч</span>
                <span>×</span>
                <span>{Number(p.hourly_rate)} л/ч</span>
              </div>
              <p className="font-mono text-lg font-bold text-white">
                {formatMoney(Number(p.total_amount))}
              </p>
            </div>

            {p.paid_at && (
              <p className="mt-1.5 text-[10px] text-emerald-400">
                Получено:{" "}
                {format(new Date(p.paid_at), "d MMM, HH:mm", { locale: ru })}
              </p>
            )}

            {p.status === "approved" && (
              <Button
                variant="blue"
                className="mt-3 w-full"
                size="default"
                disabled={isPending}
                onClick={() => handleConfirm(p.id)}
              >
                {isPending ? "..." : "Подтвердить получение"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
