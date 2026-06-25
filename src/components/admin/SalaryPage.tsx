"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { ru } from "date-fns/locale";
import {
  getEmployees,
  getShiftsForPeriod,
  createPayment,
  approvePayment,
  getAllPayments,
  getMonthlyReport,
  deletePayment,
} from "@/actions/salaryActions";
import { getFines } from "@/actions/finesActions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/store/userStore";
import type { FineWithUser, SalaryPaymentWithUser, User, MonthlyReportEmployee } from "@/types/database";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface SalaryPageProps {
  onBack?: () => void;
}

export function SalaryPage({ onBack }: SalaryPageProps) {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<User[]>([]);
  const [payments, setPayments] = useState<SalaryPaymentWithUser[]>([]);
  const [fines, setFines] = useState<FineWithUser[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<{ employees: MonthlyReportEmployee[]; grandTotal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedEmp, setSelectedEmp] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preview, setPreview] = useState<{ hours: number; amount: number; rate: number; shiftCount: number; fines: number } | null>(null);
  const [view, setView] = useState<"create" | "payments" | "report">("create");

  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);

  const loadData = useCallback(async () => {
    const initData = useUserStore.getState().initData ?? "";
    const [empResult, payResult, finesResult] = await Promise.all([
      getEmployees(initData),
      getAllPayments(initData),
      getFines(undefined, undefined, initData),
    ]);
    if (empResult.success && empResult.data) setEmployees(empResult.data);
    if (payResult.success && payResult.data) setPayments(payResult.data);
    if (finesResult.success && finesResult.data) setFines(finesResult.data);
    setLoading(false);
  }, []);

  const loadReport = useCallback(async () => {
    const initData = useUserStore.getState().initData ?? "";
    const result = await getMonthlyReport(reportYear, reportMonth, initData);
    if (result.success && result.data) setMonthlyReport(result.data);
  }, [reportYear, reportMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!selectedEmp || !dateFrom || !dateTo) {
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const calc = await getShiftsForPeriod(selectedEmp, dateFrom, dateTo);
      if (cancelled) return;
      if (calc.success && calc.data) {
        const empFines = fines.filter(
          (f) => f.user_id === selectedEmp && f.period_start >= dateFrom && f.period_end <= dateTo,
        );
        const totalFines = empFines.reduce((s, f) => s + Number(f.amount), 0);
        setPreview({ ...calc.data, fines: totalFines });
      }
    });
    return () => { cancelled = true; };
  }, [selectedEmp, dateFrom, dateTo, fines]);

  const handleCreate = () => {
    if (!selectedEmp || !dateFrom || !dateTo) {
      setError(t("salary.selectDates"));
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const initData = useUserStore.getState().initData ?? "";
      const result = await createPayment(selectedEmp, dateFrom, dateTo, initData);
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      setSuccess(t("salary.created"));
      setSelectedEmp("");
      setDateFrom("");
      setDateTo("");
      setPreview(null);
      void loadData();
    });
  };

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const result = await approvePayment(id, useUserStore.getState().user?.id ?? "");
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      void loadData();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePayment(id, useUserStore.getState().user?.id ?? "");
      if (!result.success) {
        setError(result.error ?? t("common.error"));
        return;
      }
      void loadData();
    });
  };

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const approvedPayments = payments.filter((p) => p.status === "approved");
  const paidPayments = payments.filter((p) => p.status === "paid");

  const monthNames = [t("month.january"), t("month.february"), t("month.march"), t("month.april"), t("month.may"), t("month.june"), t("month.july"), t("month.august"), t("month.september"), t("month.october"), t("month.november"), t("month.december")];

  const setWeekRange = (weeksOffset: number) => {
    const now = new Date();
    const target = weeksOffset === 0 ? now : weeksOffset < 0 ? subWeeks(now, Math.abs(weeksOffset)) : addWeeks(now, weeksOffset);
    const weekStart = startOfWeek(target, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(target, { weekStartsOn: 1 });
    setDateFrom(format(weekStart, "yyyy-MM-dd"));
    setDateTo(format(weekEnd, "yyyy-MM-dd"));
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border-color)] px-4 py-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} aria-label="Назад" className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">{t("salary.paymentsLabel")}</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{t("salary.payments")}</h1>
          </div>
        </div>
      </header>

      <div className="flex gap-2 px-4 pt-4">
        {(["create", "payments", "report"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              view === v ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {v === "create" ? t("salary.create") : v === "payments" ? `${t("salary.payments")} (${pendingPayments.length})` : t("salary.report")}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {view === "create" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("salary.newPayment")}</p>

            <div>
              <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.employee")}</p>
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
              >
                <option value="">{t("salary.selectEmployee")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.hourly_rate} л/ч</option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.quickPeriods")}</p>
              <div className="flex gap-2">
                <button onClick={() => setWeekRange(0)} className="flex-1 rounded-xl border border-[var(--border-color)] py-2 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">{t("salary.thisWeek")}</button>
                <button onClick={() => setWeekRange(-1)} className="flex-1 rounded-xl border border-[var(--border-color)] py-2 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-primary)]">{t("salary.lastWeek")}</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.from")}</p>
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder={t("salary.fromPlaceholder")} maxDate={dateTo || undefined} />
              </div>
              <div>
                <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("salary.to")}</p>
                <DatePicker value={dateTo} onChange={setDateTo} placeholder={t("salary.toPlaceholder")} minDate={dateFrom || undefined} />
              </div>
            </div>
          </div>

          {preview && (
            <div className="rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--brand-primary)]">{t("salary.calculation")}</p>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{t("salary.hours")}</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{preview.hours.toFixed(1)} ч</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{t("salary.rate")}</span>
                <span className="font-mono text-[var(--text-primary)]">{preview.rate} л/ч</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{t("salary.shifts")}</span>
                <span className="font-mono text-[var(--text-primary)]">{preview.shiftCount}</span>
              </div>
              {preview.fines > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{t("salary.fines")}</span>
                  <span className="font-mono text-rose-400">-{formatMoney(preview.fines)}</span>
                </div>
              )}
              <div className="border-t border-[var(--brand-primary)]/20 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{t("salary.total")}</span>
                <span className="font-mono text-lg font-bold text-[var(--brand-primary)]">{formatMoney(preview.amount)}</span>
              </div>
            </div>
          )}

          <Button variant="blue" className="w-full" disabled={isPending || !preview || preview.hours <= 0} onClick={handleCreate}>
            {isPending ? t("salary.creating") : t("salary.createPayment")}
          </Button>
        </div>
      )}

      {view === "payments" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          {pendingPayments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">{t("salary.pending", { count: pendingPayments.length })}</p>
              <div className="space-y-2">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{p.users.full_name}</p>
                        {p.users.position && <p className="text-[10px] text-[var(--text-secondary)]">{p.users.position}</p>}
                        <p className="text-xs text-[var(--text-secondary)]">
                          {format(new Date(p.period_start), "d MMM", { locale: ru })} — {format(new Date(p.period_end), "d MMM", { locale: ru })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">{t("salary.waiting")}</span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{Number(p.hours_worked).toFixed(1)} ч × {Number(p.hourly_rate)} л/ч</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{formatMoney(Number(p.total_amount))}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="blue" className="flex-1" disabled={isPending} onClick={() => handleApprove(p.id)}>{t("salary.approve")}</Button>
                      <Button variant="ghost" className="flex-1" disabled={isPending} onClick={() => handleDelete(p.id)}>{t("salary.delete")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvedPayments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">{t("salary.approved", { count: approvedPayments.length })}</p>
              <div className="space-y-2">
                {approvedPayments.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{p.users.full_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {format(new Date(p.period_start), "d MMM", { locale: ru })} — {format(new Date(p.period_end), "d MMM", { locale: ru })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-[var(--accent-money)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">{t("salary.approvedStatus")}</span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">{Number(p.hours_worked).toFixed(1)} ч</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{formatMoney(Number(p.total_amount))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paidPayments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">{t("salary.paid", { count: paidPayments.length })}</p>
              <div className="space-y-2">
                {paidPayments.slice(0, 20).map((p) => (
                  <div key={p.id} className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{p.users.full_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {format(new Date(p.period_start), "d MMM", { locale: ru })} — {format(new Date(p.period_end), "d MMM", { locale: ru })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">{t("salary.paidStatus")}</span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">{Number(p.hours_worked).toFixed(1)} ч</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{formatMoney(Number(p.total_amount))}</span>
                    </div>
                    {p.paid_at && (
                      <p className="mt-1 text-[10px] text-emerald-400">
                        {format(new Date(p.paid_at), "d MMM, HH:mm", { locale: ru })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && (
            <div className="flex min-h-[30vh] items-center justify-center">
              <p className="text-[var(--text-secondary)]">{t("salary.noPayments")}</p>
            </div>
          )}
        </div>
      )}

      {view === "report" && (
        <div className="px-4 pt-4 pb-24 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => { if (reportMonth === 1) { setReportMonth(12); setReportYear(reportYear - 1); } else { setReportMonth(reportMonth - 1); } }} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <p className="text-lg font-bold text-[var(--text-primary)]">{monthNames[reportMonth - 1]} {reportYear}</p>
            <div className="flex gap-2">
              <a
                href={`/api/export/salary?year=${reportYear}&month=${reportMonth}`}
                download
                className="rounded-xl p-2 text-[var(--brand-primary)] hover:bg-[var(--bg-surface)]"
                title="Скачать CSV"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </a>
              <button onClick={() => { if (reportMonth === 12) { setReportMonth(1); setReportYear(reportYear + 1); } else { setReportMonth(reportMonth + 1); } }} className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>
          </div>

          {monthlyReport && monthlyReport.employees.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="grid grid-cols-4 gap-px bg-[var(--border-color)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <div className="bg-[var(--bg-surface)] px-3 py-2">{t("salary.employee")}</div>
                <div className="bg-[var(--bg-surface)] px-3 py-2 text-center">{t("salary.hours")}</div>
                <div className="bg-[var(--bg-surface)] px-3 py-2 text-center">{t("salary.shiftsPlural")}</div>
                <div className="bg-[var(--bg-surface)] px-3 py-2 text-right">{t("salary.amount")}</div>
              </div>
              {monthlyReport.employees.map((emp) => (
                <div key={emp.id} className="grid grid-cols-4 gap-px bg-[var(--border-color)]">
                  <div className="bg-[var(--bg-surface)] px-3 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{emp.full_name}</p>
                    {emp.position && <p className="text-[10px] text-[var(--text-secondary)]">{emp.position}</p>}
                  </div>
                  <div className="bg-[var(--bg-surface)] px-3 py-3 text-center">
                    <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{emp.totalHours.toFixed(1)}</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] px-3 py-3 text-center">
                    <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{emp.totalShifts}</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] px-3 py-3 text-right">
                    <p className="font-mono text-sm font-bold text-[var(--brand-primary)]">{formatMoney(emp.totalAmount)}</p>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-px bg-[var(--border-color)]">
                <div className="bg-[var(--accent-money)]/10 px-3 py-3 col-span-3">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{t("salary.total")}</p>
                </div>
                <div className="bg-[var(--accent-money)]/10 px-3 py-3 text-right">
                  <p className="font-mono text-lg font-bold text-[var(--brand-primary)]">{formatMoney(monthlyReport.grandTotal)}</p>
                </div>
              </div>
            </div>
          )}

          {monthlyReport && monthlyReport.employees.length === 0 && (
            <div className="flex min-h-[30vh] items-center justify-center">
              <p className="text-[var(--text-secondary)]">{t("salary.noData")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
