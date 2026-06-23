"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
        theme === "dark"
          ? "border-[#334155] bg-[#1E293B] text-[#D6BC97] hover:bg-[#334155]"
          : "border-[#E2E8F0] bg-white text-[#2D3748] hover:bg-[#F7FAFC]"
      } ${className}`}
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
