import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:hover:bg-[#334155]",
        blue: "bg-[#008080] text-white hover:opacity-90 shadow-lg dark:bg-[#D6BC97] dark:text-[#0F172A] dark:hover:opacity-90 dark:shadow-[#D6BC97]/20",
        rose: "bg-rose-500 text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20",
        outline: "border border-[#E2E8F0] bg-transparent text-[#2D3748] hover:bg-[#F7FAFC] dark:border-[#334155] dark:text-[#F8FAFC] dark:hover:bg-[#1E293B]",
        ghost: "text-[#2D3748] hover:bg-[#F7FAFC] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#F8FAFC]",
      },
      size: {
        default: "h-11 px-5 py-2 text-base",
        lg: "h-14 px-8 text-lg",
        xl: "h-auto min-h-[45vh] w-full px-8 py-10 text-3xl font-black tracking-wide",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
