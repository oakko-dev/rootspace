"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CopyButton({ copied, disabled = false, label, onClick }) {
	return (
		<Button
			type="button"
			onClick={onClick}
			variant="ghost"
			size="icon"
			className="shrink-0 text-muted-foreground hover:text-primary"
			aria-label={label}
			title={label}
			disabled={disabled}
		>
			{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}
