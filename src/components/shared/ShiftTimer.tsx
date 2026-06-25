"use client";

import React, { useEffect, useState } from "react";
import { formatDuration, getElapsedSeconds } from "@/lib/utils";

interface ShiftTimerProps {
  clockIn: string;
  className?: string;
}

export const ShiftTimer = React.memo(function ShiftTimer({ clockIn, className }: ShiftTimerProps) {
  const [seconds, setSeconds] = useState(() => getElapsedSeconds(clockIn));

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(getElapsedSeconds(clockIn));
    }, 5000);

    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className={className} aria-live="polite">
      {formatDuration(seconds)}
    </span>
  );
});
