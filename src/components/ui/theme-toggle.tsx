"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold transition-all bg-[var(--card)] hover:bg-[var(--card-border)] ${
        theme === "dark"
          ? "text-[var(--accent)]"
          : "text-[var(--fg)]"
      } ${className}`}
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
