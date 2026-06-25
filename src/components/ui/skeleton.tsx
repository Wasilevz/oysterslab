import React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.memo(function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[var(--bg-surface)]", className)}
      {...props}
    />
  );
});

export { Skeleton };
