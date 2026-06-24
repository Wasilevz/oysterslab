import { create } from "zustand";
import type { User } from "@/types/database";

type AuthStatus = "idle" | "loading" | "authenticated" | "denied" | "error";

interface UserState {
  user: User | null;
  telegramId: number | null;
  status: AuthStatus;
  error: string | null;
  initData: string | null;
  selectedLocationId: string | null;
  setLoading: () => void;
  setUser: (user: User, initData?: string) => void;
  setDenied: (telegramId: number | null, message?: string) => void;
  setError: (message: string) => void;
  setSelectedLocation: (locationId: string | null) => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  telegramId: null,
  status: "idle",
  error: null,
  initData: null,
  selectedLocationId: typeof window !== "undefined" ? localStorage.getItem("selectedLocation") : null,
  setLoading: () =>
    set({ status: "loading", error: null }),
  setUser: (user, initData) => {
    const storedLocation = typeof window !== "undefined" ? localStorage.getItem("selectedLocation") : null;
    set({
      user,
      telegramId: user.telegram_id,
      status: "authenticated",
      error: null,
      initData: initData ?? null,
      selectedLocationId: storedLocation,
    });
  },
  setDenied: (telegramId, message) =>
    set({
      user: null,
      telegramId,
      status: "denied",
      error: message ?? "Доступ закрыт",
    }),
  setError: (message) =>
    set({
      user: null,
      status: "error",
      error: message,
    }),
  setSelectedLocation: (locationId) => {
    if (typeof window !== "undefined") {
      if (locationId) localStorage.setItem("selectedLocation", locationId);
      else localStorage.removeItem("selectedLocation");
    }
    set({ selectedLocationId: locationId });
  },
  reset: () =>
    set({
      user: null,
      telegramId: null,
      status: "idle",
      error: null,
      initData: null,
      selectedLocationId: null,
    }),
}));
