"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ro } from "date-fns/locale";
import { approvePayroll, generatePayroll } from "@/actions/adminActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/userStore";
import { useI18n } from "@/lib/i18n";
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
  const { t, locale } = useI18n();
  const dateLocale = locale === "ro" ? ro : ru;
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
        setError(result.error ?? t("common.error"));
        setProcessingId(null);
        return;
      }

      setProcessingId(null);
      onApproved();
    });
  };

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) {
      setError(t("common.error"));
      return;
    }

    if (periodStart > periodEnd) {
      setError(t("common.error"));
      return;
    }

    setError(null);
    setGenResult(null);

    startTransition(async () => {
      const result = await generatePayroll(periodStart, periodEnd, useUserStore.getState().initData ?? "");

      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }

      setGenResult(t("payroll.calculated", { count: String(result.data) }));
      onApproved();
    });
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--brand-primary)]">
          {t("payroll.calculate")}
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("payroll.from")}</p>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("payroll.to")}</p>
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
          {isPending ? t("payroll.calculating") : t("payroll.calculate")}
        </Button>
        {genResult && (
          <p className="mt-2 text-sm text-[var(--brand-primary)]">{genResult}</p>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 px-4 py-3">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {payrolls.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-center text-[var(--text-secondary)]">{t("payroll.noDrafts")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("payroll.employee")}</TableHead>
              <TableHead>{t("payroll.period")}</TableHead>
              <TableHead>{t("salary.hours")}</TableHead>
              <TableHead>{t("salary.amount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrolls.map((payroll) => (
              <TableRow key={payroll.id}>
                <TableCell className="font-semibold">
                  {payroll.users.full_name}
                </TableCell>
                <TableCell className="text-[var(--text-secondary)]">
                  {format(new Date(payroll.period_start), "d MMM", {
                    locale: dateLocale,
                  })}
                  {" — "}
                  {format(new Date(payroll.period_end), "d MMM", {
                    locale: dateLocale,
                  })}
                </TableCell>
                <TableCell>{payroll.total_hours} {t("common.hoursAbbrev")}</TableCell>
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
                      : t("payroll.approve")}
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
