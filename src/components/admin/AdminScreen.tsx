"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { ForgottenTab } from "@/components/admin/ForgottenTab";
import { HoursChart } from "@/components/admin/HoursChart";
import { LiveTab } from "@/components/admin/LiveTab";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { SalaryPage } from "@/components/admin/SalaryPage";
import { SettingsPage } from "@/components/admin/SettingsPage";
import { StatsCards } from "@/components/admin/StatsCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserStore } from "@/store/userStore";
import type { DashboardStats } from "@/types/database";

const POLL_INTERVAL_MS = 15000;

export function AdminScreen() {
  const user = useUserStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);

  const loadStats = useCallback(async () => {
    const result = await getDashboardStats();

    if (!result.success || !result.data) {
      setError(result.error ?? "Не удалось загрузить данные");
      setLoading(false);
      return;
    }

    setStats(result.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();

    const interval = setInterval(() => {
      void loadStats();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-12 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-800/60 px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Панель управления
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {user?.full_name}
        </h1>
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {stats && <StatsCards stats={stats} />}

      <div className="mt-4 flex-1">
        <Tabs defaultValue="live" className="flex flex-1 flex-col">
          <div className="px-4">
            <TabsList>
              <TabsTrigger value="live">
                Смены
                {(stats?.activeShifts.length ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500/20 px-1 text-[10px] font-bold text-blue-400">
                    {stats?.activeShifts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="forgotten">
                Забывашки
                {(stats?.autoClosedShifts.length ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-bold text-amber-400">
                    {stats?.autoClosedShifts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="salary">Выплаты</TabsTrigger>
              <TabsTrigger value="settings">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4 flex-1">
            <TabsContent value="live">
              <LiveTab activeShifts={stats?.activeShifts ?? []} />
            </TabsContent>

            <TabsContent value="forgotten">
              <ForgottenTab
                shifts={stats?.autoClosedShifts ?? []}
                onReviewed={loadStats}
              />
            </TabsContent>

            <TabsContent value="salary" className="flex-1">
              <SalaryPage thisMonthPayroll={stats?.thisMonthPayroll ?? 0} />
            </TabsContent>

            <TabsContent value="settings" className="flex-1">
              <SettingsPage />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {(stats?.employeeHours.length ?? 0) > 0 || (stats?.monthRevenue.length ?? 0) > 0 ? (
        <div className="border-t border-zinc-800/60 px-4 pt-4 pb-8">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex w-full items-center justify-between py-2 text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>Аналитика</span>
            <svg
              className={`h-4 w-4 transition-transform ${showCharts ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showCharts && (
            <div className="mt-3 space-y-4">
              {stats && stats.employeeHours.length > 0 && (
                <HoursChart data={stats.employeeHours} />
              )}
              {stats && stats.monthRevenue.length > 0 && (
                <RevenueChart data={stats.monthRevenue} />
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
