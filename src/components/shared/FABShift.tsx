"use client";

import { useState } from "react";
import { useUserStore } from "@/store/userStore";
import { useToast } from "@/store/toastStore";
import { hapticImpact, hapticNotification } from "@/lib/haptic";
import { useI18n } from "@/lib/i18n";

interface FABShiftProps {
  isOnShift: boolean;
  onToggled: () => void;
}

export function FABShift({ isOnShift, onToggled }: FABShiftProps) {
  const { t } = useI18n();
  const show = useToast((s) => s.show);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    hapticImpact("medium");
    setLoading(true);

    try {
      const initData = useUserStore.getState().initData ?? "";
      const action = isOnShift ? "clockOut" : "clockIn";

      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, initData }),
      });

      const data = await res.json();

      if (!res.ok) {
        hapticNotification("error");
        show(data.error ?? t("common.operationError"), "error");
      } else {
        hapticNotification("success");
        show(isOnShift ? t("shift.closed") : t("shift.opened"), "success");
        onToggled();
      }
    } catch {
      hapticNotification("error");
      show(t("common.networkError"), "error");
    }

    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          flex items-center gap-3
          rounded-full
          px-8 py-4
          text-base font-bold
          shadow-2xl
          transition-all duration-300
          active:scale-95
          disabled:opacity-60
          ${isOnShift
            ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/30"
            : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
          }
        `}
      >
        {loading ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isOnShift ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
        )}
        {loading ? "..." : isOnShift ? t("shift.end") : t("shift.start")}
      </button>
    </div>
  );
}
