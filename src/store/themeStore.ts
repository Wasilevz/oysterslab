import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initFromTelegram: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",

  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(theme);
      root.setAttribute("data-theme", theme);
    }
    set({ theme });
  },

  initFromTelegram: () => {
    try {
      // @ts-ignore
      const WebApp = window?.Telegram?.WebApp;
      if (WebApp?.colorScheme) {
        const tgTheme: Theme = WebApp.colorScheme === "dark" ? "dark" : "light";
        localStorage.setItem("theme", tgTheme);
        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(tgTheme);
        root.setAttribute("data-theme", tgTheme);
        set({ theme: tgTheme });

        WebApp.onEvent("themeChanged", () => {
          // @ts-ignore
          const newTheme: Theme = WebApp.colorScheme === "dark" ? "dark" : "light";
          localStorage.setItem("theme", newTheme);
          const r = document.documentElement;
          r.classList.remove("dark", "light");
          r.classList.add(newTheme);
          r.setAttribute("data-theme", newTheme);
          set({ theme: newTheme });
        });
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("theme") as Theme | null;
        const initial = stored ?? "dark";
        applyTheme(initial);
        set({ theme: initial });
      }
    } catch {
      const stored = localStorage.getItem("theme") as Theme | null;
      const initial = stored ?? "dark";
      applyTheme(initial);
      set({ theme: initial });
    }
  },
}));

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}
