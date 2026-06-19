"use client";

import { Users, Clock, Banknote } from "lucide-react";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  stats: DashboardStats;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function StatsCards({ stats }: StatsCardsProps) {
  const thisMonthRevenue =
    stats.monthRevenue.length > 0
      ? stats.monthRevenue[stats.monthRevenue.length - 1].amount
      : 0;
  const thisMonthHours =
    stats.employeeHours.reduce((s, e) => s + e.hours, 0);

  const cards = [
    {
      label: "На смене",
      value: stats.activeShifts.length,
      icon: Clock,
      color: "text-blue-400",
      bg: "from-blue-500/10 to-blue-600/5",
      border: "border-blue-500/20",
      glow: "shadow-blue-500/5",
    },
    {
      label: "Сотрудников",
      value: stats.totalEmployees,
      icon: Users,
      color: "text-blue-300",
      bg: "from-blue-400/10 to-blue-500/5",
      border: "border-blue-400/20",
      glow: "shadow-blue-400/5",
    },
    {
      label: "Часов (мес)",
      value: thisMonthHours.toFixed(1),
      icon: Clock,
      color: "text-sky-400",
      bg: "from-sky-500/10 to-sky-600/5",
      border: "border-sky-500/20",
      glow: "shadow-sky-500/5",
    },
    {
      label: "Зарплата (мес)",
      value: formatMoney(thisMonthRevenue),
      icon: Banknote,
      color: "text-blue-400",
      bg: "from-indigo-500/10 to-blue-600/5",
      border: "border-indigo-500/20",
      glow: "shadow-indigo-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg} p-4 shadow-lg ${card.glow}`}
        >
          <card.icon className={`mb-2 h-5 w-5 ${card.color}`} />
          <p className="text-2xl font-bold text-white">{card.value}</p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
