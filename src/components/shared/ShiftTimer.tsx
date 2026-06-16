"use client";

import { useEffect, useState } from "react";
import { formatDuration, getElapsedMinutes } from "@/lib/utils";

interface ShiftTimerProps {
  clockIn: string;
  className?: string;
}

export function ShiftTimer({ clockIn, className }: ShiftTimerProps) {
  const [minutes, setMinutes] = useState(() => getElapsedMinutes(clockIn));

  useEffect(() => {
    setMinutes(getElapsedMinutes(clockIn));

    const interval = setInterval(() => {
      setMinutes(getElapsedMinutes(clockIn));
    }, 1000);

    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className={className} aria-live="polite">
      {formatDuration(minutes)}
    </span>
  );
}
