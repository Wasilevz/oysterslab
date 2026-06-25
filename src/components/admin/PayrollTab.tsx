"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { approvePayroll, generatePayroll } from "@/actions/adminActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PayrollWithUser } from "@/types/database";

interface PayrollTabProps {
  payrolls: PayrollWithUser[];
  onApproved: () => void;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PayrollTab({ payrolls, onApproved }: PayrollTabProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);

  const handleApprove = (payrollId: string) => {
    setProcessingId(payrollId);
    setError(null);

    startTransition(async () => {
      const result = await approvePayroll(payrollId, useUserStore.getState().initData ?? "");

      if (!result.success) {
        setError(result.error ?? "Ошибка утверждения");
        setProcessingId(null);
        return;
      }

      setProcessingId(null);
      onApproved();
    });
  };

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
      const result = await generatePayroll(periodStart, periodEnd, useUserStore.getState().initData ?? "");

      if (!result.success) {
        setError(result.error ?? "Ошибка расчёта");
        return;
      }

      setGenResult(`Создано ведомостей: ${result.data}`);
      onApproved();
    });
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
        <p className="mb-3 text-sm font-semibold text-blue-400">
          Рассчитать зарплату
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
          {isPending ? "Расчёт..." : "Рассчитать"}
        </Button>
        {genResult && (
          <p className="mt-2 text-sm text-blue-400">{genResult}</p>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-950/40 px-4 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      {payrolls.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-center text-zinc-500">Черновиков зарплат нет</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Часы</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrolls.map((payroll) => (
              <TableRow key={payroll.id}>
                <TableCell className="font-semibold">
                  {payroll.users.full_name}
                </TableCell>
                <TableCell className="text-zinc-400">
                  {format(new Date(payroll.period_start), "d MMM", {
                    locale: ru,
                  })}
                  {" — "}
                  {format(new Date(payroll.period_end), "d MMM", {
                    locale: ru,
                  })}
                </TableCell>
                <TableCell>{payroll.total_hours} ч</TableCell>
                <TableCell className="font-bold">
                  {formatMoney(payroll.total_amount)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="blue"
                    size="default"
                    disabled={isPending && processingId === payroll.id}
                    onClick={() => handleApprove(payroll.id)}
                  >
                    {isPending && processingId === payroll.id
                      ? "..."
                      : "Утвердить"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
