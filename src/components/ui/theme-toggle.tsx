"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
        theme === "dark"
          ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
      } ${className}`}
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
