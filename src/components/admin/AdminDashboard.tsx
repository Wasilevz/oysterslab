"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { getLocations } from "@/actions/locationActions";
import { getActiveShift } from "@/actions/shiftActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { StatsCards } from "@/components/admin/StatsCards";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/userStore";
import { useI18n } from "@/lib/i18n";
import type { DashboardStats, Location, Shift } from "@/types/database";

type AdminView = "live" | "forgotten" | "salary" | "schedule" | "settings" | "shifts";

interface AdminDashboardProps {
  onNavigate: (view: AdminView) => void;
}

const POLL_INTERVAL_MS = 15000;

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const user = useUserStore((s) => s.user);
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myShift, setMyShift] = useState<Shift | null>(null);
  const [isPending, startTransition] = useTransition();

  const adminLocationId = user?.location_id;

  const loadStats = useCallback(async () => {
    const result = await getDashboardStats(user?.id);
    if (result.success && result.data) {
      setStats(result.data);
      setError(null);
    } else {
      setError(result.error ?? "Ошибка");
    }
    setLoading(false);
  }, [user?.id]);

  const loadLocations = useCallback(async () => {
    const result = await getLocations();
    if (result.success && result.data) setLocations(result.data);
  }, []);

  const loadMyShift = useCallback(async () => {
    if (!user) return;
    const result = await getActiveShift(user.id);
    if (result.success) setMyShift(result.data ?? null);
  }, [user]);

  useEffect(() => {
    void loadStats();
    void loadMyShift();
    void loadLocations();
    const interval = setInterval(() => {
      void loadStats();
      void loadMyShift();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStats, loadMyShift, loadLocations]);

  const handleToggleShift = () => {
    if (!user) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/clock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, action: myShift ? "clockOut" : "clockIn", initData: useUserStore.getState().initData }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Ошибка");
          return;
        }
        void loadMyShift();
        void loadStats();
      } catch {
        setError("Ошибка сети");
      }
    });
  };

  const menuItems = [
    { key: "live" as const, title: t("nav.shifts"), badge: stats?.activeShifts.length },
    { key: "forgotten" as const, title: t("nav.forgotten"), badge: stats?.autoClosedShifts.length },
    { key: "salary" as const, title: t("nav.salary") },
    { key: "schedule" as const, title: t("nav.schedule") },
    { key: "shifts" as const, title: t("nav.shiftEditor") },
    { key: "settings" as const, title: t("nav.settings") },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-24">
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
            {t("nav.dashboard")}
          </p>
          <ThemeToggle />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{user?.full_name}</h1>

          {!adminLocationId && locations.length > 0 && (
            <span className="rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--brand-primary)]">
              Все локации
            </span>
          )}

          {adminLocationId && locations.length > 0 && (
            <span className="rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--brand-primary)]">
              {locations.find((l) => l.id === adminLocationId)?.name || "Локация"}
            </span>
          )}
        </div>

        {myShift && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--brand-primary)]/10 bg-[var(--brand-primary)]/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-primary)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
              </span>
              <span className="text-xs font-medium text-[var(--brand-primary)]">{t("shift.active")}</span>
            </div>
            <ShiftTimer
              clockIn={myShift.clock_in}
              className="font-mono text-lg font-black tabular-nums text-[var(--text-primary)]"
            />
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/10 px-4 py-3">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {stats && <StatsCards stats={stats} />}

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 text-left transition-all active:scale-[0.98] hover:border-[var(--brand-primary)]/30"
            >
              <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
              {item.badge != null && item.badge > 0 && (
                <span className="absolute right-3 top-3 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-warning)]/20 px-1 text-[10px] font-bold text-[var(--color-warning)]">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        <EmployeeSalary />
      </div>
    </div>
  );
}
