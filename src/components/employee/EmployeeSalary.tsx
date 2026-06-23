"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getAllPayments, confirmPayment } from "@/actions/salaryActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const user = useUserStore((s) => s.user);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;
    const result = await getAllPayments();
    if (result.success && result.data) {
      setPayments(result.data.filter((p) => p.user_id === user.id));
    } else {
      setError(result.error ?? t("common.error"));
    }
    setLoading(false);
  }, [user, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const handleConfirm = (id: string) => {
    startTransition(async () => {
      const result = await confirmPayment(id);
      if (!result.success) {
        setError(result.error ?? t("common.error"));
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

  const myPayments = payments.filter((p) => p.user_id === user?.id);
  if (myPayments.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide dark:text-[#475569] text-[#718096]">
        {t("employee.salary")}
      </h2>

      {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

      <ul className="space-y-2">
        {myPayments.map((p) => (
          <li
            key={p.id}
            className={`rounded-2xl border p-4 ${
              p.status === "paid"
                ? "border-emerald-500/10 bg-emerald-500/5"
                : p.status === "approved"
                  ? "border-[#008080]/10 bg-[#008080]/5"
                  : "dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-[#F1F5F9]/80"
            }`}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm dark:text-[#94A3B8] text-[#718096]">
                {format(new Date(p.period_start), "d MMM", { locale: ru })} —{" "}
                {format(new Date(p.period_end), "d MMM", { locale: ru })}
              </p>
              {p.status === "paid" ? (
                <span className="rounded-lg dark:bg-emerald-500/10 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{t("salary.received")}</span>
              ) : p.status === "approved" ? (
                <span className="rounded-lg dark:bg-[#D6BC97]/10 bg-[#E6F7F7] px-2 py-0.5 text-[10px] font-bold text-[#008080]">{t("salary.approvedStatus")}</span>
              ) : (
                <span className="rounded-lg dark:bg-amber-500/10 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-400">{t("salary.waiting")}</span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs dark:text-[#94A3B8] text-[#718096]">{Number(p.hours_worked).toFixed(1)} ч × {Number(p.hourly_rate)} л/ч</span>
              <p className="font-mono text-lg font-bold dark:text-[#F8FAFC] text-[#2D3748]">{formatMoney(Number(p.total_amount))}</p>
            </div>

            {p.paid_at && (
              <p className="mt-1.5 text-[10px] text-emerald-400">
                {t("salary.received")}: {format(new Date(p.paid_at), "d MMM, HH:mm", { locale: ru })}
              </p>
            )}

            {p.status === "approved" && (
              <Button variant="blue" className="mt-3 w-full" disabled={isPending} onClick={() => handleConfirm(p.id)}>
                {isPending ? "..." : t("salary.confirmReceipt")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
