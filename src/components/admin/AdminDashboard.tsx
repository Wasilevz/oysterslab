"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getDashboardStats } from "@/actions/adminActions";
import { getActiveShift } from "@/actions/shiftActions";
import { ShiftTimer } from "@/components/shared/ShiftTimer";
import { EmployeeSalary } from "@/components/employee/EmployeeSalary";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/userStore";
import type { DashboardStats, Shift } from "@/types/database";

type AdminView = "live" | "forgotten" | "salary" | "schedule" | "settings";

interface AdminDashboardProps {
  onNavigate: (view: AdminView) => void;
}

const POLL_INTERVAL_MS = 15000;

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const user = useUserStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myShift, setMyShift] = useState<Shift | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadStats = useCallback(async () => {
    const result = await getDashboardStats();
    if (result.success && result.data) {
      setStats(result.data);
      setError(null);
    } else {
      setError(result.error ?? "Ошибка");
    }
    setLoading(false);
  }, []);

  const loadMyShift = useCallback(async () => {
    if (!user) return;
    const result = await getActiveShift(user.id);
    if (result.success) setMyShift(result.data ?? null);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();
    void loadMyShift();
    const interval = setInterval(() => {
      void loadStats();
      void loadMyShift();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStats, loadMyShift]);

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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      key: "live" as const,
      title: "Смены",
      desc: "Кто сейчас работает",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-blue-400",
      bg: "from-blue-500/10 to-blue-600/5",
      border: "border-blue-500/20",
      badge: stats?.activeShifts.length,
      badgeColor: "bg-blue-500/20 text-blue-400",
    },
    {
      key: "forgotten" as const,
      title: "Забывашки",
      desc: "Автозакрытые смены",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      ),
      color: "text-amber-400",
      bg: "from-amber-500/10 to-amber-600/5",
      border: "border-amber-500/20",
      badge: stats?.autoClosedShifts.length,
      badgeColor: "bg-amber-500/20 text-amber-400",
    },
    {
      key: "salary" as const,
      title: "Выплаты",
      desc: "Зарплаты и расчёты",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      color: "text-emerald-400",
      bg: "from-emerald-500/10 to-emerald-600/5",
      border: "border-emerald-500/20",
    },
    {
      key: "schedule" as const,
      title: "График",
      desc: "Расписание сотрудников",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      color: "text-violet-400",
      bg: "from-violet-500/10 to-violet-600/5",
      border: "border-violet-500/20",
    },
    {
      key: "settings" as const,
      title: "Настройки",
      desc: "Сотрудники и безопасность",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "text-zinc-400",
      bg: "from-zinc-500/10 to-zinc-600/5",
      border: "border-zinc-500/20",
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col p-4 pb-24">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-600">
          Панель управления
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>

          <button
            onClick={handleToggleShift}
            disabled={isPending}
            className={`rounded-2xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 ${
              myShift
                ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            }`}
          >
            {isPending ? "..." : myShift ? "Завершить смену" : "Начать смену"}
          </button>
        </div>

        {myShift && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-500/10 bg-blue-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
              <span className="text-xs font-medium text-blue-400">На смене</span>
            </div>
            <ShiftTimer
              clockIn={myShift.clock_in}
              className="font-mono text-lg font-black tabular-nums text-white"
            />
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`relative overflow-hidden rounded-2xl border ${item.border} bg-gradient-to-br ${item.bg} p-4 text-left transition-all active:scale-[0.98]`}
          >
            <div className={`mb-3 ${item.color}`}>{item.icon}</div>
            <p className="text-sm font-bold text-white">{item.title}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">{item.desc}</p>
            {item.badge != null && item.badge > 0 && (
              <span className={`absolute right-3 top-3 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        <EmployeeSalary />
      </div>
    </div>
  );
}
