"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  approveSalary,
  checkPeriodCalculated,
  generateSalaryForPeriod,
  getSalaryStats,
} from "@/actions/salaryActions";
import { addFine, deleteFine, getFines } from "@/actions/finesActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FineWithUser, SalaryPaymentWithUser } from "@/types/database";

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
  const [fines, setFines] = useState<FineWithUser[]>([]);
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
  const [fineUserId, setFineUserId] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineReason, setFineReason] = useState("");
  const [showFineForm, setShowFineForm] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  const loadData = useCallback(async () => {
    const [salaryResult, finesResult] = await Promise.all([
      getSalaryStats(),
      getFines(),
    ]);
    if (salaryResult.success && salaryResult.data) {
      setPayments(salaryResult.data.payments);
      setTotalPending(salaryResult.data.totalPending);
      setTotalApproved(salaryResult.data.totalApproved);
      setTotalPaid(salaryResult.data.totalPaid);
    } else {
      setError(salaryResult.error ?? "Ошибка загрузки");
    }
    if (finesResult.success && finesResult.data) {
      setFines(finesResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleGenerate = async () => {
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

    const check = await checkPeriodCalculated(periodStart, periodEnd);
    if (check.success && check.data) {
      setError("Расчёт за этот период уже был произведён");
      return;
    }

    startTransition(async () => {
      const result = await generateSalaryForPeriod(periodStart, periodEnd);
      if (!result.success) {
        setError(result.error ?? "Ошибка расчёта");
        return;
      }
      setGenResult(`Создано записей: ${result.data}`);
      setPeriodStart("");
      setPeriodEnd("");
      setShowGenerateForm(false);
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

  const handleApproveAll = () => {
    const pendingPayments = payments.filter((p) => p.status === "pending");
    if (pendingPayments.length === 0) return;

    startTransition(async () => {
      for (const p of pendingPayments) {
        await approveSalary(p.id);
      }
      void loadData();
    });
  };

  const handleAddFine = () => {
    if (!fineUserId || !fineAmount || !fineReason) {
      setError("Заполните все поля штрафа");
      return;
    }
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    startTransition(async () => {
      const result = await addFine(
        fineUserId,
        Number(fineAmount),
        fineReason,
        weekStart.toISOString().split("T")[0],
        weekEnd.toISOString().split("T")[0],
      );
      if (!result.success) {
        setError(result.error ?? "Ошибка добавления штрафа");
        return;
      }
      setFineUserId("");
      setFineAmount("");
      setFineReason("");
      setShowFineForm(false);
      void loadData();
    });
  };

  const handleDeleteFine = (id: string) => {
    startTransition(async () => {
      const result = await deleteFine(id);
      if (!result.success) {
        setError(result.error ?? "Ошибка удаления штрафа");
        return;
      }
      void loadData();
    });
  };

  const uniqueEmployees = payments.reduce<{ id: string; name: string }[]>((acc, p) => {
    if (!acc.find((e) => e.id === p.user_id)) {
      acc.push({ id: p.user_id, name: p.users.full_name });
    }
    return acc;
  }, []);

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const filtered = payments.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
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

      {pendingPayments.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-400">
                Ожидают одобрения
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {pendingPayments.length} {pendingPayments.length === 1 ? "запись" : "записей"}
              </p>
            </div>
            <Button
              variant="blue"
              size="default"
              disabled={isPending}
              onClick={handleApproveAll}
            >
              {isPending ? "..." : "Одобрить все"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mx-4 mt-4">
        <button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="flex w-full items-center justify-between rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 text-left"
        >
          <span className="text-sm font-semibold text-blue-400">
            Рассчитать за период
          </span>
          <svg
            className={`h-4 w-4 text-blue-400 transition-transform ${showGenerateForm ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showGenerateForm && (
          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
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
        )}
      </div>

      <div className="mx-4 mt-4">
        <button
          onClick={() => setShowFineForm(!showFineForm)}
          className="flex w-full items-center justify-between rounded-2xl border border-rose-500/10 bg-rose-500/5 p-4 text-left"
        >
          <span className="text-sm font-semibold text-rose-400">Штрафы</span>
          <svg
            className={`h-4 w-4 text-rose-400 transition-transform ${showFineForm ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showFineForm && (
          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
            <div className="space-y-2">
              <select
                value={fineUserId}
                onChange={(e) => setFineUserId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                <option value="">Сотрудник</option>
                {uniqueEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="Сумма (MDL)"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Причина"
                value={fineReason}
                onChange={(e) => setFineReason(e.target.value)}
              />
              <Button
                variant="blue"
                className="w-full"
                disabled={isPending || !fineUserId || !fineAmount || !fineReason}
                onClick={handleAddFine}
              >
                {isPending ? "..." : "Добавить штраф"}
              </Button>
            </div>

            {fines.length > 0 && (
              <div className="mt-3 space-y-2">
                {fines.map((fine) => (
                  <div
                    key={fine.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{fine.users.full_name}</p>
                      <p className="text-[10px] text-zinc-500">{fine.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-rose-400">
                        -{Number(fine.amount)} л
                      </span>
                      <button
                        onClick={() => handleDeleteFine(fine.id)}
                        className="text-xs text-zinc-600 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
          <div className="flex min-h-[20vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-400">Нет записей</p>
              <p className="mt-1 text-xs text-zinc-600">Рассчитайте зарплату за период</p>
            </div>
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
                  {p.users.position && (
                    <p className="text-xs text-zinc-400">{p.users.position}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
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

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-4 text-sm">
                  <span className="text-zinc-400">
                    {Number(p.hours_worked).toFixed(1)} ч × {Number(p.hourly_rate)} л/ч
                  </span>
                </div>
                <p className="font-mono text-lg font-bold text-white">
                  {formatMoney(Number(p.total_amount))}
                </p>
              </div>

              {p.paid_at && (
                <p className="mt-2 text-xs text-emerald-400">
                  Получено:{" "}
                  {format(new Date(p.paid_at), "d MMM, HH:mm", {
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
                  {isPending ? "..." : "Одобрить"}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
