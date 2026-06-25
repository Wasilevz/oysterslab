"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LiveTab } from "@/components/admin/LiveTab";
import { ForgottenTab } from "@/components/admin/ForgottenTab";
import { SalaryPage } from "@/components/admin/SalaryPage";
import { ScheduleAdmin } from "@/components/admin/ScheduleAdmin";
import { ShiftEditor } from "@/components/admin/ShiftEditor";
import { SettingsPage } from "@/components/admin/SettingsPage";
import { hapticImpact } from "@/lib/haptic";

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
      {renderView()}
    </main>
  );
}
