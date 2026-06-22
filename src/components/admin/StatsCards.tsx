"use client";

import { Users, Clock } from "lucide-react";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
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
