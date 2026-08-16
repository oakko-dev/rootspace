"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatJson } from "@/lib/json-formatter";

const sampleInput = "";

export default function JsonFormatterTool() {
	const [input, setInput] = useState(sampleInput);
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(false);

	function handleFormat(action) {
		const result = formatJson(input, action);

		if (!result.ok) {
			setError(result.error);
			setOutput("");
			return;
		}

		setError("");
		setOutput(result.output);
	}

	async function handleCopy() {
		if (!output) {
			return;
		}

		try {
			await navigator.clipboard.writeText(output);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
			setError("Could not copy to clipboard.");
		}
	}

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>JSON formatter</CardTitle>
					<CardDescription>
						Pretty-print or minify JSON without leaving the browser.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="json-input">JSON input</Label>
						<Textarea
							id="json-input"
							value={input}
							onChange={(event) => setInput(event.target.value)}
							className="min-h-56 font-mono"
							placeholder='{"name":"oak"}'
						/>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={() => handleFormat("pretty")}>
							Pretty
						</Button>
						<Button type="button" onClick={() => handleFormat("minify")} variant="outline">
							Minify
						</Button>
					</div>

					{error ? <Alert variant="warning">{error}</Alert> : null}
				</CardContent>
			</Card>

			<Card className="flex flex-col gap-3 p-3">
				<div className="flex items-start justify-between gap-3">
					<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">Output</p>
					<CopyButton copied={copied} label="Copy output" onClick={handleCopy} disabled={!output} />
				</div>
				<Textarea
					value={output}
					readOnly
					className="min-h-72 bg-background font-mono"
					placeholder="Formatted JSON will appear here."
				/>
			</Card>
		</section>
	);
}
