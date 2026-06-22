import { create } from "zustand";
import type { User } from "@/types/database";

type AuthStatus = "idle" | "loading" | "authenticated" | "denied" | "error";

interface UserState {
  user: User | null;
  telegramId: number | null;
  status: AuthStatus;
  error: string | null;
  initData: string | null;
  viewAs: "admin" | "employee" | null;
  setLoading: () => void;
  setUser: (user: User, initData?: string) => void;
  setDenied: (telegramId: number | null, message?: string) => void;
  setError: (message: string) => void;
  toggleViewAs: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  telegramId: null,
  status: "idle",
  error: null,
  initData: null,
  viewAs: null,
  setLoading: () =>
    set({ status: "loading", error: null }),
  setUser: (user, initData) =>
    set({
      user,
      telegramId: user.telegram_id,
      status: "authenticated",
      error: null,
      initData: initData ?? null,
      viewAs: null,
    }),
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
  toggleViewAs: () =>
    set((state) => ({
      viewAs: state.viewAs === null
        ? state.user?.role === "admin" ? "employee" : "admin"
        : null,
    })),
  reset: () =>
    set({
      user: null,
      telegramId: null,
      status: "idle",
      error: null,
      initData: null,
      viewAs: null,
    }),
}));
