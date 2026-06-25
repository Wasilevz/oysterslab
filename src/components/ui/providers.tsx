"use client";

import { ThemeProvider } from "@/components/ui/theme-provider";
import { ToastContainer } from "@/components/shared/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ToastContainer />
    </ThemeProvider>
  );
}
