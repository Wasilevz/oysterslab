"use client";

import { useEffect, useRef } from "react";
import type { Shift } from "@/types/database";

interface MainButtonShiftProps {
  activeShift: Shift | null;
  onToggle: () => void;
  loading: boolean;
}

export function MainButtonShift({ activeShift, onToggle, loading }: MainButtonShiftProps) {
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: WebApp } = await import("@twa-dev/sdk");
      if (cancelled) return;

      const btn = WebApp.MainButton;

      if (activeShift) {
        btn.setText("Завершить смену");
        btn.setParams({
          color: "#EF4444",
          text_color: "#FFFFFF",
          is_active: !loading,
          is_visible: true,
        });
      } else {
        btn.setText("Начать смену");
        btn.setParams({
          color: "#10B981",
          text_color: "#FFFFFF",
          is_active: !loading,
          is_visible: true,
        });
      }

      const handleClick = () => onToggleRef.current();
      btn.onClick(handleClick);

      return () => {
        btn.offClick(handleClick);
      };
    })();

    return () => {
      cancelled = true;
      import("@twa-dev/sdk").then(({ default: WebApp }) => {
        WebApp.MainButton.hide();
      });
    };
  }, [activeShift, loading]);

  useEffect(() => {
    (async () => {
      const { default: WebApp } = await import("@twa-dev/sdk");
      if (loading) {
        WebApp.MainButton.showProgress();
      } else {
        WebApp.MainButton.hideProgress();
      }
    })();
  }, [loading]);

  return null;
}
