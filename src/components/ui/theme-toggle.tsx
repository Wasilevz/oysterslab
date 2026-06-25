"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-[4px] border border-[var(--border-color)] px-4 py-2 text-[14px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all ${className}`}
    >
      <span className="text-sm">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
