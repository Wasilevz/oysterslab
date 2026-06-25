"use client";

import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: Toast["type"]) => void;
  dismiss: (id: string) => void;
}

let counter = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  show: (message, type = "info") => {
    const id = `toast-${++counter}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
