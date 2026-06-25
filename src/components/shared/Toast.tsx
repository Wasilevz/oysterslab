"use client";

import { useToast } from "@/store/toastStore";

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const colors = {
          success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
          error: "border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]",
          info: "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
        };

        return (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto max-w-xs rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-top-2 fade-in duration-200 ${colors[toast.type]}`}
          >
            {toast.message}
          </button>
        );
      })}
    </div>
  );
}
