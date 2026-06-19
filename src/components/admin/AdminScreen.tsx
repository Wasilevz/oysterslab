"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { ForgottenTab } from "@/components/admin/ForgottenTab";
import { LiveTab } from "@/components/admin/LiveTab";
import { PayrollTab } from "@/components/admin/PayrollTab";
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
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-800 px-4 py-4">
        <p className="text-sm text-zinc-500">Панель шефа</p>
        <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
      </header>

      {error && (
        <p className="mx-4 mt-4 rounded-xl bg-rose-950/40 px-4 py-3 text-sm text-rose-400">
          {error}
        </p>
      )}

      <Tabs defaultValue="live" className="flex-1">
        <TabsContent value="live">
          <LiveTab activeShifts={stats?.activeShifts ?? []} />
        </TabsContent>

        <TabsContent value="forgotten">
          <ForgottenTab
            shifts={stats?.autoClosedShifts ?? []}
            onReviewed={loadStats}
          />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollTab
            payrolls={stats?.draftPayrolls ?? []}
            onApproved={loadStats}
          />
        </TabsContent>

        <TabsList>
          <TabsTrigger value="live">
            Лайв
            {(stats?.activeShifts.length ?? 0) > 0 && (
              <span className="mt-0.5 text-xs text-emerald-400">
                {stats?.activeShifts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="forgotten">
            Забывашки
            {(stats?.autoClosedShifts.length ?? 0) > 0 && (
              <span className="mt-0.5 text-xs text-amber-400">
                {stats?.autoClosedShifts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payroll">Зарплаты</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
