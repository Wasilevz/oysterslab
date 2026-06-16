"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { approvePayroll } from "@/actions/adminActions";
import { Button } from "@/components/ui/button";
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
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PayrollTab({ payrolls, onApproved }: PayrollTabProps) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = (payrollId: string) => {
    setProcessingId(payrollId);
    setError(null);

    startTransition(async () => {
      const result = await approvePayroll(payrollId);

      if (!result.success) {
        setError(result.error ?? "Ошибка утверждения");
        setProcessingId(null);
        return;
      }

      setProcessingId(null);
      onApproved();
    });
  };

  if (payrolls.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-center text-zinc-500">Черновиков зарплат нет</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {error && (
        <p className="mb-3 rounded-xl bg-rose-950/40 px-4 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

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
                  variant="emerald"
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
    </div>
  );
}
