"use client";

import { useMemo, useState } from "react";
import CopyButton from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertDateInput } from "@/lib/date-converter";

const sampleInput = "";

export default function DateConverterTool() {
	const [input, setInput] = useState(sampleInput);
	const [copiedKey, setCopiedKey] = useState("");
	const result = useMemo(() => convertDateInput(input), [input]);

	const outputs = result.ok
		? [
				["Input type", result.inputType],
				["Local", result.local],
				["UTC", result.utc],
				["ISO", result.iso],
				["Unix seconds", result.unixSeconds],
				["Unix milliseconds", result.unixMilliseconds],
			]
		: [];

	async function handleCopy(key, value) {
		try {
			await navigator.clipboard.writeText(String(value));
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey(""), 1500);
		} catch {
			setCopiedKey("");
		}
	}

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Date converter</CardTitle>
					<CardDescription>
						Parse ISO dates, natural date text, and Unix timestamps.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="date-input">Date input</Label>
						<Input
							id="date-input"
							value={input}
							onChange={(event) => setInput(event.target.value)}
							className="font-mono"
							placeholder="ISO date, date text, Unix seconds, or Unix ms"
						/>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={() => setInput(new Date().toISOString())}>
							Use now
						</Button>
						<Button type="button" onClick={() => setInput(sampleInput)} variant="outline">
							Reset sample
						</Button>
					</div>

					{result.ok ? null : <Alert variant="warning">{result.error}</Alert>}
				</CardContent>
			</Card>

			<div className="grid gap-3 sm:grid-cols-2">
				{outputs.map(([label, value]) => (
					<Card key={label}>
						<CardContent className="p-3">
							<div className="flex items-start justify-between gap-3">
								<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">
									{label}
								</p>
								<CopyButton
									copied={copiedKey === `date-${label}`}
									label={`Copy ${label}`}
									onClick={() => handleCopy(`date-${label}`, value)}
								/>
							</div>
							<p className="mt-2 break-words font-mono text-sm text-foreground">{String(value)}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
