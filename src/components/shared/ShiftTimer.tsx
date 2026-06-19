"use client";

import { useEffect, useState } from "react";
import { formatDuration, getElapsedSeconds } from "@/lib/utils";

interface ShiftTimerProps {
  clockIn: string;
  className?: string;
}

export function ShiftTimer({ clockIn, className }: ShiftTimerProps) {
  const [seconds, setSeconds] = useState(() => getElapsedSeconds(clockIn));

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(getElapsedSeconds(clockIn));
    }, 1000);

    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className={className} aria-live="polite">
      {formatDuration(seconds)}
    </span>
  );
}
