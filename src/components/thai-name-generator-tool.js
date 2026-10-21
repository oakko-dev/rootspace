"use client";

import { useState } from "react";
import CopyButton from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateThaiName } from "@/lib/thai-name-generator";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 5;

const FIELDS = [
	{ key: "full-name", label: "Full name", th: "fullName", en: "fullNameEn" },
	{ key: "firstname", label: "First name", th: "firstname", en: "firstnameEn" },
	{ key: "lastname", label: "Last name", th: "lastname", en: "lastnameEn" },
	{ key: "nickname", label: "Nickname", th: "nickname", en: "nicknameEn" },
	{ key: "combined", label: "Combined", th: "displayName", en: "displayNameEn" },
	{ key: "citizen-number", label: "Citizen number", th: "citizenNumber" },
];

function ValueCell({ copied, label, onCopy, value }) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<span className="min-w-0 flex-1 break-words font-mono text-sm text-foreground">
				{value ?? "-"}
			</span>
			<CopyButton copied={copied} label={label} onClick={onCopy} disabled={!value} />
		</div>
	);
}

export default function ThaiNameGeneratorTool() {
	const [people, setPeople] = useState([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [thaiNameData, setThaiNameData] = useState(null);
	const [thaiNameError, setThaiNameError] = useState("");
	const [isLoadingThaiName, setIsLoadingThaiName] = useState(false);
	const [copiedKey, setCopiedKey] = useState("");
	const person = people[selectedIndex];

	async function handleGenerateThaiName(count) {
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

			setPeople(Array.from({ length: count }, () => generateThaiName(data)));
			setSelectedIndex(0);
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
		<Card className="max-w-3xl">
			<CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border p-4">
				<div className="space-y-1">
					<CardTitle className="text-base">Random Thai identity</CardTitle>
					<CardDescription className="leading-5">
						Thai and English names, nickname and citizen number from the local name list.
					</CardDescription>
				</div>
				<div className="flex gap-2">
					<Button
						type="button"
						size="sm"
						onClick={() => handleGenerateThaiName(1)}
						disabled={isLoadingThaiName}
					>
						{isLoadingThaiName ? "Generating..." : "Generate name"}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => handleGenerateThaiName(BATCH_SIZE)}
						disabled={isLoadingThaiName}
					>
						Generate {BATCH_SIZE}
					</Button>
				</div>
			</CardHeader>

			{thaiNameError ? (
				<div className="border-b border-border p-4">
					<Alert variant="warning">{thaiNameError}</Alert>
				</div>
			) : null}

			{people.length > 1 ? (
				<fieldset className="border-b border-border p-2">
					<legend className="sr-only">Generated people</legend>
					{people.map((item, index) => (
						<button
							key={`${item.citizenNumber}-${index}`}
							type="button"
							aria-pressed={index === selectedIndex}
							onClick={() => setSelectedIndex(index)}
							className={cn(
								"flex w-full flex-wrap items-baseline gap-x-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								index === selectedIndex && "bg-accent",
							)}
						>
							<span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
							<span className="font-mono text-sm text-foreground">{item.fullName}</span>
							<span className="font-mono text-xs text-muted-foreground">{item.fullNameEn}</span>
						</button>
					))}
				</fieldset>
			) : null}

			<div className="hidden grid-cols-[8rem_1fr_1fr] gap-3 border-b border-border px-4 py-2 font-mono text-xs font-semibold uppercase text-muted-foreground sm:grid">
				<span />
				<span>Thai</span>
				<span>English</span>
			</div>

			<dl className="divide-y divide-border">
				{FIELDS.map(({ key, label, th, en }) => {
					const copyKey = `${selectedIndex}-${key}`;

					return (
						<div
							key={key}
							className="grid grid-cols-[7rem_1fr] items-center gap-x-3 px-4 py-1.5 sm:grid-cols-[8rem_1fr_1fr]"
						>
							<dt className="font-mono text-xs font-semibold uppercase text-muted-foreground">
								{label}
							</dt>
							<dd className={cn("min-w-0", !en && "sm:col-span-2")}>
								<ValueCell
									copied={copiedKey === `${copyKey}-th`}
									label={`Copy ${label.toLowerCase()}${en ? " in Thai" : ""}`}
									onCopy={() => handleCopy(`${copyKey}-th`, person?.[th] ?? "")}
									value={person?.[th]}
								/>
							</dd>
							{en ? (
								<dd className="col-start-2 min-w-0 sm:col-start-auto">
									<ValueCell
										copied={copiedKey === `${copyKey}-en`}
										label={`Copy ${label.toLowerCase()} in English`}
										onCopy={() => handleCopy(`${copyKey}-en`, person?.[en] ?? "")}
										value={person?.[en]}
									/>
								</dd>
							) : null}
						</div>
					);
				})}
			</dl>
		</Card>
	);
}
