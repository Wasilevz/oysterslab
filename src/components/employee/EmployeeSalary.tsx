"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ro } from "date-fns/locale";
import { getMyPayments, confirmPayment } from "@/actions/salaryActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { SalaryPayment } from "@/types/database";

function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EmployeeSalary() {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ro" ? ro : ru;
  const user = useUserStore((s) => s.user);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    if (!user) return;
    const initData = useUserStore.getState().initData;
    const result = await getMyPayments(user.id, initData ?? "");
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
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {t("employee.salary")}
      </h2>

      {error && <p className="mb-2 text-sm text-[var(--color-error)]">{error}</p>}

      <ul className="space-y-2">
        {myPayments.map((p) => (
          <li
            key={p.id}
            className={`rounded-2xl border p-4 ${
              p.status === "paid"
                ? "border-emerald-500/10 bg-emerald-500/5"
                : p.status === "approved"
                  ? "border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5"
                  : "border-[var(--border-color)] bg-[var(--bg-surface)]"
            }`}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-[var(--text-secondary)]">
                {format(new Date(p.period_start), "d MMM", { locale: dateLocale })} —{" "}
                {format(new Date(p.period_end), "d MMM", { locale: dateLocale })}
              </p>
              {p.status === "paid" ? (
                <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">{t("salary.received")}</span>
              ) : p.status === "approved" ? (
                <span className="rounded-lg bg-[var(--accent-money)]/10 px-2 py-0.5 text-xs font-bold text-[var(--brand-primary)]">{t("salary.approvedStatus")}</span>
              ) : (
                <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">{t("salary.waiting")}</span>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">{t("salary.hoursXrate", { hours: Number(p.hours_worked).toFixed(1), rate: Number(p.hourly_rate) })}</span>
              <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{formatMoney(Number(p.total_amount), locale)}</p>
            </div>

            {p.paid_at && (
              <p className="mt-1.5 text-xs text-emerald-400">
                {t("salary.received")}: {format(new Date(p.paid_at), "d MMM, HH:mm", { locale: dateLocale })}
              </p>
            )}

            {p.status === "approved" && (
              <Button variant="blue" className="mt-3 w-full" disabled={isPending} onClick={() => handleConfirm(p.id)}>
                {isPending ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : t("salary.confirmReceipt")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
