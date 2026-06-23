import { create } from "zustand";
import ru from "@/i18n/ru.json";
import ro from "@/i18n/ro.json";

export type Locale = "ru" | "ro";

const translations: Record<Locale, Record<string, string>> = { ru, ro };

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: (typeof window !== "undefined"
    ? (localStorage.getItem("locale") as Locale) || "ru"
    : "ru") as Locale,

  setLocale: (locale: Locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", locale);
    }
    set({ locale });
  },

  t: (key: string, params?: Record<string, string | number>) => {
    const { locale } = get();
    let text = translations[locale][key] ?? translations.ru[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return text;
  },
}));
