import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-[rgba(71,103,136,0.06)_0px_4px_5px_0px,rgba(71,103,136,0.03)_0px_8px_15px_0px,rgba(71,103,136,0.08)_0px_15px_30px_0px]",
        blue: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-[rgba(71,103,136,0.06)_0px_4px_5px_0px,rgba(71,103,136,0.03)_0px_8px_15px_0px,rgba(71,103,136,0.08)_0px_15px_30px_0px]",
        rose: "bg-[var(--color-error)] text-white hover:opacity-90",
        outline: "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
        ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
      },
      size: {
        default: "h-11 px-6 py-2 text-[16px]",
        lg: "h-14 px-8 text-[18px]",
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
