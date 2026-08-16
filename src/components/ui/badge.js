import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				outline: "text-foreground",
				success: "border-transparent bg-emerald-400/15 text-emerald-300",
				warning: "border-transparent bg-amber-400/15 text-amber-300",
				destructive: "border-transparent bg-destructive/15 text-red-300",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export function Badge({ className, variant = "default", ...props }) {
	return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
