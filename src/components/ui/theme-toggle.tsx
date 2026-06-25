"use client";

import { useThemeStore } from "@/store/themeStore";
import { useI18n } from "@/lib/i18n";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  const { t } = useI18n();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`flex items-center gap-2 rounded-[2px] border border-[var(--text-secondary)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] transition-all ${className}`}
    >
      <span className="text-sm">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? t("theme.dark") : t("theme.light")}</span>
    </button>
  );
}
