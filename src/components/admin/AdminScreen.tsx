"use client";

import { useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LiveTab } from "@/components/admin/LiveTab";
import { ForgottenTab } from "@/components/admin/ForgottenTab";
import { SalaryPage } from "@/components/admin/SalaryPage";
import { ScheduleAdmin } from "@/components/admin/ScheduleAdmin";
import { ShiftEditor } from "@/components/admin/ShiftEditor";
import { SettingsPage } from "@/components/admin/SettingsPage";
import { useUserStore } from "@/store/userStore";

type AdminView = "dashboard" | "live" | "forgotten" | "salary" | "schedule" | "settings" | "shifts";

export function AdminScreen() {
  const user = useUserStore((s) => s.user);
  const [view, setView] = useState<AdminView>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  const renderView = () => {
    switch (view) {
      case "live":
        return <LiveTab onBack={() => setView("dashboard")} />;
      case "forgotten":
        return <ForgottenTab onBack={() => setView("dashboard")} onReviewed={refresh} />;
      case "salary":
        return <SalaryPage onBack={() => setView("dashboard")} />;
      case "schedule":
        return <ScheduleAdmin onBack={() => setView("dashboard")} />;
      case "settings":
        return <SettingsPage onBack={() => setView("dashboard")} />;
      case "shifts":
        return <ShiftEditor onBack={() => setView("dashboard")} />;
      default:
        return <AdminDashboard onNavigate={setView} />;
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {renderView()}
    </main>
  );
}
