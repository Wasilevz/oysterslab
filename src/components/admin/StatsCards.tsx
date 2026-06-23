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
      color: "text-[var(--accent)]",
      bg: "from-[var(--accent)] to-[var(--accent)]/50",
      border: "border-[var(--accent)]/20",
      glow: "shadow-[var(--accent)]/5",
    },
    {
      label: t("stats.employees"),
      value: stats.totalEmployees,
      icon: Users,
      color: "text-[var(--accent)]",
      bg: "from-[var(--accent)] to-[var(--accent)]/50",
      border: "border-[var(--accent)]/20",
      glow: "shadow-[var(--accent)]/5",
    },
    ...(pendingCount > 0
      ? [
          {
            label: t("stats.attention"),
            value: pendingCount,
            icon: AlertCircle,
            color: "text-amber-400",
            bg: "from-amber-50 to-amber-100/50",
            border: "border-amber-500/20",
            glow: "shadow-amber-200/50",
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
          <p className="text-2xl font-bold text-[var(--fg)]">{card.value}</p>
          <p className="mt-0.5 text-xs font-medium text-[var(--muted)]">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
