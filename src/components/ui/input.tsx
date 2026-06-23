import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#2D3748] placeholder:text-[#A0AEC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008080] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus-visible:ring-[#D6BC97]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
