"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { hapticImpact } from "@/lib/haptic";

const LiveTab = lazy(() => import("@/components/admin/LiveTab").then(m => ({ default: m.LiveTab })));
const ForgottenTab = lazy(() => import("@/components/admin/ForgottenTab").then(m => ({ default: m.ForgottenTab })));
const SalaryPage = lazy(() => import("@/components/admin/SalaryPage").then(m => ({ default: m.SalaryPage })));
const ScheduleAdmin = lazy(() => import("@/components/admin/ScheduleAdmin").then(m => ({ default: m.ScheduleAdmin })));
const ShiftEditor = lazy(() => import("@/components/admin/ShiftEditor").then(m => ({ default: m.ShiftEditor })));
const SettingsPage = lazy(() => import("@/components/admin/SettingsPage").then(m => ({ default: m.SettingsPage })));

type AdminView = "dashboard" | "live" | "forgotten" | "salary" | "schedule" | "settings" | "shifts";

export function AdminScreen() {
  const [view, setView] = useState<AdminView>("dashboard");

  const goBack = () => {
    hapticImpact("light");
    setView("dashboard");
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import("@twa-dev/sdk").then(({ default: WebApp }) => {
      if (view !== "dashboard") {
        WebApp.BackButton.show();
        WebApp.BackButton.onClick(goBack);
        cleanup = () => {
          WebApp.BackButton.hide();
          WebApp.BackButton.offClick(goBack);
        };
      } else {
        WebApp.BackButton.hide();
      }
    });

    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const renderView = () => {
    switch (view) {
      case "live":
        return <LiveTab onBack={goBack} />;
      case "forgotten":
        return <ForgottenTab onBack={goBack} />;
      case "salary":
        return <SalaryPage onBack={goBack} />;
      case "schedule":
        return <ScheduleAdmin onBack={goBack} />;
      case "settings":
        return <SettingsPage onBack={goBack} />;
      case "shifts":
        return <ShiftEditor onBack={goBack} />;
      default:
        return <AdminDashboard onNavigate={setView} />;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] animate-fade-in">
      <Suspense fallback={<div className="flex flex-1 flex-col gap-4 p-4 pb-24"><Skeleton className="h-8 w-32" /><Skeleton className="h-64 w-full rounded-2xl" /></div>}>
        {renderView()}
      </Suspense>
    </main>
  );
}
