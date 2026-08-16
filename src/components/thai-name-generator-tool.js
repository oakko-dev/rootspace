"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateThaiName } from "@/lib/thai-name-generator";

export default function ThaiNameGeneratorTool() {
	const [thaiName, setThaiName] = useState(null);
	const [thaiNameData, setThaiNameData] = useState(null);
	const [thaiNameError, setThaiNameError] = useState("");
	const [isLoadingThaiName, setIsLoadingThaiName] = useState(false);
	const [copiedKey, setCopiedKey] = useState("");

	async function handleGenerateThaiName() {
		setIsLoadingThaiName(true);
		setThaiNameError("");

		try {
			const data =
				thaiNameData ??
				(await fetch("/thai-names.json").then((response) => {
					if (!response.ok) {
						throw new Error("Could not load thai names.");
					}

					return response.json();
				}));

			if (!thaiNameData) {
				setThaiNameData(data);
			}

			setThaiName(generateThaiName(data));
		} catch (error) {
			setThaiNameError(error instanceof Error ? error.message : "Could not load thai names.");
		} finally {
			setIsLoadingThaiName(false);
		}
	}

	async function handleCopy(key, value) {
		try {
			await navigator.clipboard.writeText(String(value));
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey(""), 1500);
		} catch {
			setThaiNameError("Could not copy to clipboard.");
		}
	}

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Thai name generator</CardTitle>
					<CardDescription>
						Pick a random Thai full name and nickname from the local name list.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={handleGenerateThaiName} disabled={isLoadingThaiName}>
							{isLoadingThaiName ? "Generating..." : "Generate name"}
						</Button>
					</div>

					{thaiNameError ? <Alert variant="warning">{thaiNameError}</Alert> : null}
				</CardContent>
			</Card>

			<div className="grid gap-3 sm:grid-cols-2">
				<Card className="sm:col-span-2">
					<CardContent className="p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">
								Full name
							</p>
							<CopyButton
								copied={copiedKey === "thai-full-name"}
								label="Copy full name"
								onClick={() => handleCopy("thai-full-name", thaiName?.fullName ?? "")}
								disabled={!thaiName?.fullName}
							/>
						</div>
						<p className="mt-2 break-words font-mono text-lg text-foreground">
							{thaiName?.fullName ?? "Click generate to create a Thai name."}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">
								Nickname
							</p>
							<CopyButton
								copied={copiedKey === "thai-nickname"}
								label="Copy nickname"
								onClick={() => handleCopy("thai-nickname", thaiName?.nickname ?? "")}
								disabled={!thaiName?.nickname}
							/>
						</div>
						<p className="mt-2 break-words font-mono text-sm text-foreground">
							{thaiName?.nickname ?? "-"}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">
								Citizen number
							</p>
							<CopyButton
								copied={copiedKey === "thai-citizen-number"}
								label="Copy citizen number"
								onClick={() => handleCopy("thai-citizen-number", thaiName?.citizenNumber ?? "")}
								disabled={!thaiName?.citizenNumber}
							/>
						</div>
						<p className="mt-2 break-words font-mono text-sm text-foreground">
							{thaiName?.citizenNumber ?? "-"}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="font-mono text-xs font-semibold uppercase text-muted-foreground">
								Combined
							</p>
							<CopyButton
								copied={copiedKey === "thai-combined"}
								label="Copy combined name"
								onClick={() => handleCopy("thai-combined", thaiName?.displayName ?? "")}
								disabled={!thaiName?.displayName}
							/>
						</div>
						<p className="mt-2 break-words font-mono text-sm text-foreground">
							{thaiName?.displayName ?? "-"}
						</p>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
