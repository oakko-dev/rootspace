import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-md border px-3 py-2 text-sm leading-6", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
      destructive: "border-red-400/30 bg-red-400/10 text-red-200",
      success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
}
