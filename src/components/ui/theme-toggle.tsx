"use client";

import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-300 ${
        theme === "dark"
          ? "bg-zinc-700"
          : "bg-blue-200"
      } ${className}`}
      aria-label="Toggle theme"
    >
      <span
        className={`absolute left-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow-md transition-transform duration-300 ${
          theme === "light" ? "translate-x-10" : "translate-x-0"
        }`}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
      <span className="sr-only">
        {theme === "dark" ? "Switch to light" : "Switch to dark"}
      </span>
    </button>
  );
}
