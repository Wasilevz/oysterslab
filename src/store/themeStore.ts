import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initFromTelegram: () => void;
}

let themeListenerRegistered = false;

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",

  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      applyTheme(theme);
    }
    set({ theme });
  },

  initFromTelegram: () => {
    try {
      // @ts-expect-error Telegram WebApp SDK
      const WebApp = window?.Telegram?.WebApp;
      if (WebApp?.colorScheme) {
        const tgTheme: Theme = WebApp.colorScheme === "dark" ? "dark" : "light";
        localStorage.setItem("theme", tgTheme);
        applyTheme(tgTheme);
        set({ theme: tgTheme });

        if (!themeListenerRegistered) {
          themeListenerRegistered = true;
          WebApp.onEvent("themeChanged", () => {
            const newTheme: Theme = WebApp.colorScheme === "dark" ? "dark" : "light";
            localStorage.setItem("theme", newTheme);
            applyTheme(newTheme);
            set({ theme: newTheme });
          });
        }
      } else {
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
