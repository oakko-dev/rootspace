"use client";

import { useState } from "react";
import CopyField from "@/components/copy-field";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateThaiCitizenId } from "@/lib/thai-citizen-id";

function ResultAlert({ result }) {
	if (!result.ok) {
		return <Alert variant="warning">{result.error}</Alert>;
	}

	if (result.valid) {
		return <Alert variant="success">Valid check digit.</Alert>;
	}

	return (
		<Alert variant="destructive">
			Invalid check digit. The last digit should be {result.expected}.
		</Alert>
	);
}

export default function ThaiIdValidatorTool() {
	const [input, setInput] = useState("");
	const result = input.trim() ? validateThaiCitizenId(input) : null;

	return (
		<Card className="max-w-xl">
			<CardHeader>
				<CardTitle>Thai citizen ID</CardTitle>
				<CardDescription>
					Checks the 13th digit against the official mod 11 checksum. It does not look the ID up
					anywhere.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="thai-id-input">ID number</Label>
					<Input
						id="thai-id-input"
						value={input}
						onChange={(event) => setInput(event.target.value)}
						inputMode="numeric"
						autoComplete="off"
						className="font-mono"
						placeholder="1-1037-02071-81-1"
					/>
				</div>
				{result ? <ResultAlert result={result} /> : null}
				{result?.ok ? <CopyField label="Formatted" value={result.formatted} /> : null}
			</CardContent>
		</Card>
	);
}
