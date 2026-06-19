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
import type { EmployeeHours } from "@/types/database";

interface HoursChartProps {
  data: EmployeeHours[];
}

export function HoursChart({ data }: HoursChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4">
        <p className="text-sm text-zinc-600">Нет данных за этот месяц</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="mb-4 text-sm font-semibold text-zinc-400">
        Часы по сотрудникам
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
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
            formatter={(value) => [`${value} ч`, "Часы"]}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={index === 0 ? "#3b82f6" : index < 3 ? "#60a5fa" : "#1e40af"}
                fillOpacity={1 - index * 0.1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
