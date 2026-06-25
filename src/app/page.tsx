"use client";

import { useEffect, useRef } from "react";
import { verifyTelegramAuth } from "@/actions/authActions";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { EmployeeScreen } from "@/components/employee/EmployeeScreen";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/store/userStore";
import { useThemeStore } from "@/store/themeStore";
import { useI18n } from "@/lib/i18n";

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-app)] p-4">
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
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-app)] px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("auth.accessDenied")}</h1>
        <p className="text-[var(--text-secondary)]">{message}</p>
        {telegramId !== null && (
          <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-lg text-[var(--text-primary)]">
            {t("auth.yourId")} {telegramId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { user, status, telegramId, error, setLoading, setUser, setDenied, setError } =
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

        const theme = useThemeStore.getState().theme;
        const headerBg = theme === "dark" ? "#0F1011" : "#F5F5F7";
        WebApp.setHeaderColor(headerBg);
        WebApp.setBackgroundColor(headerBg);

        // Auto-detect theme from Telegram
        useThemeStore.getState().initFromTelegram();

        const initData = WebApp.initData;
        initDataRef.current = initData || null;

        if (!initData) {
          setDenied(
            WebApp.initDataUnsafe?.user?.id ?? null,
            t("auth.openViaTelegram"),
          );
          return;
        }

        const result = await verifyTelegramAuth(initData);

        if (!result.success || !result.data) {
          setDenied(
            result.telegramId ?? null,
            result.error ?? t("auth.accessDenied"),
          );
          return;
        }

        setUser(result.data, initData);
      } catch {
        setError(t("auth.appInitError"));
      }
    }

    void bootstrap();
  }, [setLoading, setUser, setDenied, setError, t]);

  if (status === "idle" || status === "loading") {
    return <LoadingSkeleton />;
  }

  if (status === "denied") {
    return (
      <AccessDenied
        telegramId={telegramId}
        message={error ?? t("auth.accessDenied")}
      />
    );
  }

  if (status === "error") {
    return (
      <AccessDenied telegramId={telegramId} message={error ?? t("common.error")} />
    );
  }

  if (!user) {
    return <AccessDenied telegramId={telegramId} message={t("auth.userNotFound")} />;
  }

  const effectiveRole = user?.role;

  return (
    <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      {effectiveRole === "admin" ? <AdminScreen /> : <EmployeeScreen />}
    </main>
  );
}
