"use client";

import { useEffect, useRef } from "react";
import { verifyTelegramAuth } from "@/actions/authActions";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { EmployeeScreen } from "@/components/employee/EmployeeScreen";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/userStore";

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-4">
      <Skeleton className="mb-6 h-10 w-48" />
      <Skeleton className="mb-6 min-h-[40vh] w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

function AccessDenied({
  telegramId,
  message,
}: {
  telegramId: number | null;
  message: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-white">Доступ закрыт</h1>
        <p className="text-zinc-400">{message}</p>
        {telegramId !== null && (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-lg text-zinc-200">
            Ваш Telegram ID: {telegramId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, status, telegramId, error, viewAs, setLoading, setUser, setDenied, setError } =
    useUserStore();
  const initialized = useRef(false);
  const initDataRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function bootstrap() {
      setLoading();

      try {
        const { default: WebApp } = await import("@twa-dev/sdk");

        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor("#09090b");
        WebApp.setBackgroundColor("#09090b");

        const initData = WebApp.initData;
        initDataRef.current = initData || null;

        if (!initData) {
          setDenied(
            WebApp.initDataUnsafe?.user?.id ?? null,
            "Откройте приложение через Telegram",
          );
          return;
        }

        const result = await verifyTelegramAuth(initData);

        if (!result.success || !result.data) {
          setDenied(
            result.telegramId ?? null,
            result.error ?? "Доступ закрыт",
          );
          return;
        }

        setUser(result.data, initData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ошибка инициализации приложения",
        );
      }
    }

    void bootstrap();
  }, [setLoading, setUser, setDenied, setError]);

  if (status === "idle" || status === "loading") {
    return <LoadingSkeleton />;
  }

  if (status === "denied") {
    return (
      <AccessDenied
        telegramId={telegramId}
        message={error ?? "Доступ закрыт"}
      />
    );
  }

  if (status === "error") {
    return (
      <AccessDenied telegramId={telegramId} message={error ?? "Ошибка"} />
    );
  }

  if (!user) {
    return <AccessDenied telegramId={telegramId} message="Пользователь не найден" />;
  }

  const effectiveRole = viewAs ?? user?.role;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {effectiveRole === "admin" ? <AdminScreen /> : <EmployeeScreen />}
    </main>
  );
}
