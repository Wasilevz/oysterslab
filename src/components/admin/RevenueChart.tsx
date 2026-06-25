"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useThemeStore } from "@/store/themeStore";
import { useI18n } from "@/lib/i18n";
import type { MonthRevenue } from "@/types/database";

interface RevenueChartProps {
  data: MonthRevenue[];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({ data }: RevenueChartProps) {
  const theme = useThemeStore((s) => s.theme);
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center gap-3 rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-white px-4">
        <svg className="h-10 w-10 dark:text-[#334155] text-[#CBD5E1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm dark:text-[#64748B] text-[#718096]">{t("charts.noData")}</p>
      </div>
    );
  }

  // TODO: Replace hardcoded colors with CSS vars or theme store values for full dynamic theming
  const gridColor = theme === "dark" ? "#334155" : "#E2E8F0";
  const tickColor = theme === "dark" ? "#94A3B8" : "#718096";
  const tooltipBg = theme === "dark" ? "#1E293B" : "#FFFFFF";
  const tooltipBorder = theme === "dark" ? "#334155" : "#E2E8F0";
  const tooltipText = theme === "dark" ? "#F8FAFC" : "#2D3748";
  const tooltipLabel = theme === "dark" ? "#94A3B8" : "#718096";
  const strokeColor = theme === "dark" ? "#D6BC97" : "#008080";
  const gradientId = "colorAmount";

  return (
    <div className="rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-white p-4">
      <p className="mb-4 text-sm font-semibold dark:text-[#94A3B8] text-[#718096]">
        {t("charts.revenueTitle")}
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", color: tooltipText, fontSize: 13 }}
            labelStyle={{ color: tooltipLabel }}
            formatter={(value) => [formatMoney(Number(value)), t("charts.amount")]}
          />
          <Area type="monotone" dataKey="amount" stroke={strokeColor} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
