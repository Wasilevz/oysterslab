"use client";

import { useI18n } from "@/lib/i18n";
import type { DashboardStats } from "@/types/database";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useI18n();
  const pendingCount = stats.autoClosedShifts.length;

  const cards = [
    { label: t("stats.onShift"), value: stats.activeShifts.length },
    { label: t("stats.employees"), value: stats.totalEmployees },
    ...(pendingCount > 0 ? [{ label: t("stats.attention"), value: pendingCount }] : []),
  ];

  return (
    <div className={`grid ${cards.length === 3 ? "grid-cols-3" : "grid-cols-2"} gap-3 px-4`}>
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-center"
        >
          <p className="text-3xl font-bold text-[var(--text-primary)]">{card.value}</p>
          <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
