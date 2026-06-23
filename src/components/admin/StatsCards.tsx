"use client";

import { AlertCircle, Clock, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useI18n();
  const pendingCount = stats.autoClosedShifts.length;

  const cards = [
    {
      label: t("stats.onShift"),
      value: stats.activeShifts.length,
      icon: Clock,
      color: "text-[#008080]",
      bg: "dark:from-[#D6BC97]/10 dark:to-[#D6BC97]/5 from-[#E6F7F7] to-[#B2DFDB]/50",
      border: "border-[#008080]/20",
      glow: "dark:shadow-[#D6BC97]/5 shadow-[#B2DFDB]/50",
    },
    {
      label: t("stats.employees"),
      value: stats.totalEmployees,
      icon: Users,
      color: "text-[#008080]",
      bg: "dark:from-[#D6BC97]/10 dark:to-[#D6BC97]/5 from-[#E6F7F7] to-[#B2DFDB]/50",
      border: "border-[#008080]/20",
      glow: "dark:shadow-[#D6BC97]/5 shadow-[#B2DFDB]/50",
    },
    ...(pendingCount > 0
      ? [
          {
            label: t("stats.attention"),
            value: pendingCount,
            icon: AlertCircle,
            color: "text-amber-400",
            bg: "dark:from-amber-500/10 dark:to-amber-600/5 from-amber-50 to-amber-100/50",
            border: "border-amber-500/20",
            glow: "dark:shadow-amber-500/5 shadow-amber-200/50",
          },
        ]
      : []),
  ];

  return (
    <div className={`grid ${cards.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-3 px-4`}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`relative overflow-hidden rounded-2xl border ${card.border} bg-gradient-to-br ${card.bg} p-4 shadow-lg ${card.glow}`}
        >
          <card.icon className={`mb-2 h-5 w-5 ${card.color}`} />
          <p className="text-2xl font-bold dark:text-[#F8FAFC] text-[#2D3748]">{card.value}</p>
          <p className="mt-0.5 text-xs font-medium dark:text-[#64748B] text-[#718096]">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
