"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateIds, ID_TYPES, MAX_ID_COUNT, MIN_ID_COUNT } from "@/lib/id-generator";
import { cn } from "@/lib/utils";

const DEFAULT_COUNT = 5;
const COPY_ALL_KEY = "all";

export default function IdGeneratorTool() {
	const [type, setType] = useState(ID_TYPES[0].value);
	const [count, setCount] = useState(String(DEFAULT_COUNT));
	const [uppercase, setUppercase] = useState(false);
	const [dashes, setDashes] = useState(true);
	const [braces, setBraces] = useState(false);
	const [ids, setIds] = useState([]);
	const [error, setError] = useState("");
	const [copiedKey, setCopiedKey] = useState("");
	const isUuid = type !== "nanoid";

	function handleGenerate(event) {
		event.preventDefault();
		setError("");

		try {
			setIds(generateIds({ type, count: Number(count), uppercase, dashes, braces }));
		} catch (generateError) {
			setError(generateError instanceof Error ? generateError.message : "Could not generate IDs.");
		}
	}

	async function handleCopy(key, value) {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey(""), 1500);
		} catch {
			setError("Could not copy to clipboard.");
		}
	}

	return (
		<Card className="max-w-3xl">
			<CardHeader className="space-y-1 border-b border-border p-4">
				<CardTitle className="text-base">Random IDs</CardTitle>
				<CardDescription className="leading-5">
					UUID v4 (GUID), time-ordered UUID v7, or 21-character URL-safe Nano IDs, generated in your
					browser. Use uppercase and braces for the Windows / .NET GUID style.
				</CardDescription>
			</CardHeader>

			<form onSubmit={handleGenerate} className="space-y-4 border-b border-border p-4">
				<fieldset className="flex flex-wrap gap-2">
					<legend className="sr-only">ID type</legend>
					{ID_TYPES.map((option) => (
						<Button
							key={option.value}
							type="button"
							size="sm"
							variant={option.value === type ? "default" : "outline"}
							aria-pressed={option.value === type}
							onClick={() => setType(option.value)}
						>
							{option.label}
						</Button>
					))}
				</fieldset>

				<div className="flex flex-wrap items-end gap-4">
					<div className="space-y-2">
						<Label htmlFor="id-count">Count</Label>
						<Input
							id="id-count"
							type="number"
							inputMode="numeric"
							min={MIN_ID_COUNT}
							max={MAX_ID_COUNT}
							value={count}
							onChange={(event) => setCount(event.target.value)}
							className="w-24"
						/>
					</div>
					<label
						className={cn(
							"flex min-h-10 items-center gap-2 text-sm text-foreground",
							!isUuid && "opacity-50",
						)}
					>
						<input
							type="checkbox"
							checked={uppercase}
							disabled={!isUuid}
							onChange={(event) => setUppercase(event.target.checked)}
							className="h-4 w-4 accent-primary"
						/>
						Uppercase
					</label>
					<label
						className={cn(
							"flex min-h-10 items-center gap-2 text-sm text-foreground",
							!isUuid && "opacity-50",
						)}
					>
						<input
							type="checkbox"
							checked={!dashes}
							disabled={!isUuid}
							onChange={(event) => setDashes(!event.target.checked)}
							className="h-4 w-4 accent-primary"
						/>
						No dashes
					</label>
					<label
						className={cn(
							"flex min-h-10 items-center gap-2 text-sm text-foreground",
							!isUuid && "opacity-50",
						)}
					>
						<input
							type="checkbox"
							checked={braces}
							disabled={!isUuid}
							onChange={(event) => setBraces(event.target.checked)}
							className="h-4 w-4 accent-primary"
						/>
						Braces {"{ }"}
					</label>
					<Button type="submit" size="sm" className="ml-auto">
						Generate
					</Button>
				</div>
			</form>

			{error ? (
				<div className="border-b border-border p-4">
					<Alert variant="warning">{error}</Alert>
				</div>
			) : null}

			{ids.length > 0 ? (
				<>
					<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
						<span className="font-mono text-xs font-semibold uppercase text-muted-foreground">
							{ids.length} generated
						</span>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => handleCopy(COPY_ALL_KEY, ids.join("\n"))}
						>
							{copiedKey === COPY_ALL_KEY ? "Copied" : "Copy all"}
						</Button>
					</div>
					<ol className="divide-y divide-border">
						{ids.map((id, index) => (
							<li key={id} className="flex min-w-0 items-center gap-3 px-4 py-1.5">
								<span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
									{index + 1}
								</span>
								<span className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
									{id}
								</span>
								<CopyButton
									copied={copiedKey === id}
									label={`Copy ID ${index + 1}`}
									onClick={() => handleCopy(id, id)}
								/>
							</li>
						))}
					</ol>
				</>
			) : null}
		</Card>
	);
}
