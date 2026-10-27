"use client";

import { useState } from "react";
import CopyField from "@/components/copy-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ENCODINGS, transformText } from "@/lib/encoding";

export default function EncodeDecodeTool() {
	const [encoding, setEncoding] = useState(ENCODINGS[0].value);
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	function handleTransform(direction) {
		const result = transformText(encoding, direction, input);

		setError(result.ok ? "" : result.error);
		setOutput(result.ok ? result.output : "");
	}

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Encode / decode</CardTitle>
					<CardDescription>
						Base64 (UTF-8 and base64url), URL components, and HTML entities.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<fieldset className="flex flex-wrap gap-2">
						<legend className="sr-only">Encoding</legend>
						{ENCODINGS.map((option) => (
							<Button
								key={option.value}
								type="button"
								size="sm"
								variant={option.value === encoding ? "default" : "outline"}
								aria-pressed={option.value === encoding}
								onClick={() => setEncoding(option.value)}
							>
								{option.label}
							</Button>
						))}
					</fieldset>

					<div className="space-y-2">
						<Label htmlFor="encode-input">Input</Label>
						<Textarea
							id="encode-input"
							value={input}
							onChange={(event) => setInput(event.target.value)}
							className="min-h-40 font-mono"
						/>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button type="button" onClick={() => handleTransform("encode")}>
							Encode
						</Button>
						<Button type="button" variant="outline" onClick={() => handleTransform("decode")}>
							Decode
						</Button>
					</div>

					{error ? <Alert variant="warning">{error}</Alert> : null}
				</CardContent>
			</Card>

			<CopyField label="Output" value={output} className="self-start" />
		</section>
	);
}
