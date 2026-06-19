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
import type { MonthRevenue } from "@/types/database";

interface RevenueChartProps {
  data: MonthRevenue[];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4">
        <p className="text-sm text-zinc-600">Пока нет данных</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="mb-4 text-sm font-semibold text-zinc-400">
        Зарплаты по месяцам
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "12px",
              color: "#fafafa",
              fontSize: 13,
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value, name) => {
              if (name === "amount") return [formatMoney(Number(value)), "Сумма"];
              return [`${value} ч`, "Часы"];
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAmount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
