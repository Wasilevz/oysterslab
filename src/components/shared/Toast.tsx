"use client";

import { useToast } from "@/store/toastStore";

function ToastIcon({ type }: { type: "success" | "error" | "info" }) {
  if (type === "success") {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

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
        const shadows = {
          success: "shadow-[0_8px_32px_rgba(16,185,129,0.12)]",
          error: "shadow-[0_8px_32px_rgba(239,68,68,0.12)]",
          info: "shadow-[0_8px_32px_rgba(132,125,255,0.12)]",
        };

        return (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto flex max-w-xs items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur-sm transition-all animate-toast-in ${colors[toast.type]} ${shadows[toast.type]}`}
          >
            <ToastIcon type={toast.type} />
            <span>{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
