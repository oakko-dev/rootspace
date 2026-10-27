"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { cn } from "@/lib/utils";

export default function CopyField({ className, label, value }) {
	const [copied, setCopied] = useState(false);
	const text = String(value ?? "");

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className={cn("rounded-lg border border-border bg-card p-3", className)}>
			<div className="flex items-start justify-between gap-3">
				<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">{label}</p>
				<CopyButton copied={copied} label={`Copy ${label}`} onClick={handleCopy} disabled={!text} />
			</div>
			<p className="mt-2 whitespace-pre-wrap break-all font-mono text-sm text-foreground">
				{text || "-"}
			</p>
		</div>
	);
}
