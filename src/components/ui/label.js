import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
	return (
		<label
			className={cn("text-sm font-medium leading-none text-foreground", className)}
			htmlFor={props.htmlFor}
			aria-label={props["aria-label"] ?? props.children}
			{...props}
		/>
	);
}
