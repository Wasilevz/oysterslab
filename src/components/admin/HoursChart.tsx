"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useThemeStore } from "@/store/themeStore";
import { useI18n } from "@/lib/i18n";
import type { EmployeeHours } from "@/types/database";

interface HoursChartProps {
  data: EmployeeHours[];
}

export function HoursChart({ data }: HoursChartProps) {
  const theme = useThemeStore((s) => s.theme);
  const { t } = useI18n();

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-white px-4">
        <p className="text-sm dark:text-[#64748B] text-[#718096]">{t("charts.noDataMonth")}</p>
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

  return (
    <div className="rounded-2xl border dark:border-[#334155] border-[#E2E8F0] dark:bg-[#1E293B]/80 bg-white p-4">
      <p className="mb-4 text-sm font-semibold dark:text-[#94A3B8] text-[#718096]">
        {t("charts.hoursTitle")}
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", color: tooltipText, fontSize: 13 }}
            labelStyle={{ color: tooltipLabel }}
            formatter={(value) => [`${value} ${t("common.hoursAbbrev")}`, t("charts.hoursLabel")]}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={index === 0 ? "#008080" : index < 3 ? "#D6BC97" : "#C5A880"}
                fillOpacity={1 - index * 0.1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
