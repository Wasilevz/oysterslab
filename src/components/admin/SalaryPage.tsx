"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  approveSalary,
  generateSalaryForPeriod,
  getSalaryStats,
} from "@/actions/salaryActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalaryPaymentWithUser } from "@/types/database";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SalaryPageProps {
  thisMonthPayroll?: number;
}

export function SalaryPage({ thisMonthPayroll = 0 }: SalaryPageProps) {
  const [payments, setPayments] = useState<SalaryPaymentWithUser[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [totalApproved, setTotalApproved] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "paid">("all");

  const loadData = useCallback(async () => {
    const result = await getSalaryStats();
    if (result.success && result.data) {
      setPayments(result.data.payments);
      setTotalPending(result.data.totalPending);
      setTotalApproved(result.data.totalApproved);
      setTotalPaid(result.data.totalPaid);
    } else {
      setError(result.error ?? "Ошибка загрузки");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) {
      setError("Укажите период");
      return;
    }
    if (periodStart > periodEnd) {
      setError("Дата начала позже даты окончания");
      return;
    }
    setError(null);
    setGenResult(null);

    startTransition(async () => {
      const result = await generateSalaryForPeriod(periodStart, periodEnd);
      if (!result.success) {
        setError(result.error ?? "Ошибка расчёта");
        return;
      }
      setGenResult(`Создано записей: ${result.data}`);
      setPeriodStart("");
      setPeriodEnd("");
      void loadData();
    });
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveSalary(id);
      if (!result.success) {
        setError(result.error ?? "Ошибка");
        return;
      }
      void loadData();
    });
  };

  const filtered = payments.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-800/60 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Зарплаты
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Выплаты</h1>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 px-4">
        <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-3">
          <p className="text-[10px] font-medium text-zinc-500">Зарплата (мес)</p>
          <p className="mt-0.5 text-lg font-bold text-indigo-400">
            {formatMoney(thisMonthPayroll)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3">
          <p className="text-[10px] font-medium text-zinc-500">Ожидает</p>
          <p className="mt-0.5 text-lg font-bold text-amber-400">
            {formatMoney(totalPending)}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-3">
          <p className="text-[10px] font-medium text-zinc-500">Одобрено</p>
          <p className="mt-0.5 text-lg font-bold text-blue-400">
            {formatMoney(totalApproved)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-medium text-zinc-500">Выплачено</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-400">
            {formatMoney(totalPaid)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 mx-4">
        <p className="mb-3 text-sm font-semibold text-blue-400">
          Рассчитать за период
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-zinc-500">С</p>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">По</p>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="blue"
          className="w-full"
          disabled={isPending || !periodStart || !periodEnd}
          onClick={handleGenerate}
        >
          {isPending ? "Расчёт..." : "Рассчитать зарплату"}
        </Button>
        {genResult && (
          <p className="mt-2 text-sm text-blue-400">{genResult}</p>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 px-4 overflow-x-auto">
        {(["all", "pending", "approved", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-blue-500/20 text-blue-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f === "all" ? "Все" : f === "pending" ? "Ожидает" : f === "approved" ? "Одобрено" : "Выплачено"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex-1 space-y-2 px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <p className="text-zinc-500">Нет записей</p>
          </div>
        ) : (
          filtered.map((p) => (
            <div
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
                  <p className="text-lg font-bold text-white">
                    {p.users.full_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {format(new Date(p.period_start), "d MMM", { locale: ru })}
                    {" — "}
                    {format(new Date(p.period_end), "d MMM", { locale: ru })}
                  </p>
                </div>
                {p.status === "paid" ? (
                  <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    ВЫПЛАЧЕНО
                  </span>
                ) : p.status === "approved" ? (
                  <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400">
                    ОДОБРЕНО
                  </span>
                ) : (
                  <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400">
                    ОЖИДАЕТ
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500">Часы</p>
                  <p className="font-mono text-sm font-bold text-white">
                    {Number(p.hours_worked).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500">Ставка</p>
                  <p className="font-mono text-sm font-bold text-white">
                    {Number(p.hourly_rate)} л/ч
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-800/30 py-2">
                  <p className="text-[10px] text-zinc-500">Итого</p>
                  <p className="font-mono text-sm font-bold text-white">
                    {formatMoney(Number(p.total_amount))}
                  </p>
                </div>
              </div>

              {p.paid_at && (
                <p className="mt-2 text-xs text-emerald-400">
                  Получено сотрудником:{" "}
                  {format(new Date(p.paid_at), "d MMM yyyy, HH:mm", {
                    locale: ru,
                  })}
                </p>
              )}

              {p.status === "pending" && (
                <Button
                  variant="blue"
                  className="mt-3 w-full"
                  disabled={isPending}
                  onClick={() => handleApprove(p.id)}
                >
                  {isPending ? "..." : "Одобрить выплату"}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
