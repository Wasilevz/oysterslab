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
      <div className="flex h-[250px] items-center justify-center rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-white px-4">
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
