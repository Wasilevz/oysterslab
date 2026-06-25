"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { approvePayroll, generatePayroll } from "@/actions/adminActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      const result = await approvePayroll(payrollId);

      if (!result.success) {
        setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ° ÑƒÑ‚Ð²ÐµÑ€Ð¶Ð´ÐµÐ½Ð¸Ñ");
        setProcessingId(null);
        return;
      }

      setProcessingId(null);
      onApproved();
    });
  };

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) {
      setError("Ð£ÐºÐ°Ð¶Ð¸Ñ‚Ðµ Ð¿ÐµÑ€Ð¸Ð¾Ð´");
      return;
    }

    if (periodStart > periodEnd) {
      setError("Ð”Ð°Ñ‚Ð° Ð½Ð°Ñ‡Ð°Ð»Ð° Ð¿Ð¾Ð·Ð¶Ðµ Ð´Ð°Ñ‚Ñ‹ Ð¾ÐºÐ¾Ð½Ñ‡Ð°Ð½Ð¸Ñ");
      return;
    }

    setError(null);
    setGenResult(null);

    startTransition(async () => {
      const result = await generatePayroll(periodStart, periodEnd);

      if (!result.success) {
        setError(result.error ?? "ÐžÑˆÐ¸Ð±ÐºÐ° Ñ€Ð°ÑÑ‡Ñ‘Ñ‚Ð°");
        return;
      }

      setGenResult(`Ð¡Ð¾Ð·Ð´Ð°Ð½Ð¾ Ð²ÐµÐ´Ð¾Ð¼Ð¾ÑÑ‚ÐµÐ¹: ${result.data}`);
      onApproved();
    });
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 rounded-[16px] border border-blue-500/10 bg-blue-500/5 p-4">
        <p className="mb-3 text-sm font-semibold text-blue-400">
          Ð Ð°ÑÑÑ‡Ð¸Ñ‚Ð°Ñ‚ÑŒ Ð·Ð°Ñ€Ð¿Ð»Ð°Ñ‚Ñƒ
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-zinc-500">Ð¡</p>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">ÐŸÐ¾</p>
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
          {isPending ? "Ð Ð°ÑÑ‡Ñ‘Ñ‚..." : "Ð Ð°ÑÑÑ‡Ð¸Ñ‚Ð°Ñ‚ÑŒ"}
        </Button>
        {genResult && (
          <p className="mt-2 text-sm text-blue-400">{genResult}</p>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-[12px] bg-rose-950/40 px-4 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      {payrolls.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-center text-zinc-500">Ð§ÐµÑ€Ð½Ð¾Ð²Ð¸ÐºÐ¾Ð² Ð·Ð°Ñ€Ð¿Ð»Ð°Ñ‚ Ð½ÐµÑ‚</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ð¡Ð¾Ñ‚Ñ€ÑƒÐ´Ð½Ð¸Ðº</TableHead>
              <TableHead>ÐŸÐµÑ€Ð¸Ð¾Ð´</TableHead>
              <TableHead>Ð§Ð°ÑÑ‹</TableHead>
              <TableHead>Ð¡ÑƒÐ¼Ð¼Ð°</TableHead>
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
                  {" â€” "}
                  {format(new Date(payroll.period_end), "d MMM", {
                    locale: ru,
                  })}
                </TableCell>
                <TableCell>{payroll.total_hours} Ñ‡</TableCell>
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
                      : "Ð£Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚ÑŒ"}
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
