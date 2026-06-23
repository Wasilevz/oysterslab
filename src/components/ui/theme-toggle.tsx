"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-all ${className}`}
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
