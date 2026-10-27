"use client";

import { useState } from "react";
import CopyField from "@/components/copy-field";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toBahtText } from "@/lib/baht-text";

export default function BahtTextTool() {
	const [input, setInput] = useState("");
	const result = input.trim() ? toBahtText(input) : null;

	return (
		<Card className="max-w-xl">
			<CardHeader>
				<CardTitle>Baht text</CardTitle>
				<CardDescription>
					Writes an amount in Thai words for invoices and cheques. Satang round half up.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="baht-input">Amount</Label>
					<Input
						id="baht-input"
						value={input}
						onChange={(event) => setInput(event.target.value)}
						inputMode="decimal"
						className="font-mono"
						placeholder="1,250.50"
					/>
				</div>
				{result && !result.ok ? <Alert variant="warning">{result.error}</Alert> : null}
				{result?.ok ? <CopyField label="Thai text" value={result.text} /> : null}
			</CardContent>
		</Card>
	);
}
