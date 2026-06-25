import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[12px] bg-[var(--bg-surface)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
