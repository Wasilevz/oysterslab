import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
        emerald:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/40",
        rose: "bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-950/40",
        outline:
          "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900",
        ghost: "text-zinc-300 hover:bg-zinc-900 hover:text-white",
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
