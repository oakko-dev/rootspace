"use client";

import { useEffect, useState } from "react";
import CopyField from "@/components/copy-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HASH_ALGORITHMS, hashText } from "@/lib/hash";

export default function HashGeneratorTool() {
	const [input, setInput] = useState("");
	const [hashes, setHashes] = useState({});

	useEffect(() => {
		let cancelled = false;

		async function updateHashes() {
			const values = await Promise.all(
				HASH_ALGORITHMS.map((algorithm) => hashText(input, algorithm)),
			);

			if (!cancelled) {
				setHashes(
					Object.fromEntries(HASH_ALGORITHMS.map((algorithm, index) => [algorithm, values[index]])),
				);
			}
		}

		updateHashes();

		return () => {
			cancelled = true;
		};
	}, [input]);

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Hash generator</CardTitle>
					<CardDescription>
						SHA hashes of UTF-8 text, as hex. Computed in your browser; MD5 is not available.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Label htmlFor="hash-input">Text</Label>
					<Textarea
						id="hash-input"
						value={input}
						onChange={(event) => setInput(event.target.value)}
						className="min-h-40 font-mono"
					/>
				</CardContent>
			</Card>

			<div className="grid content-start gap-3">
				{HASH_ALGORITHMS.map((algorithm) => (
					<CopyField key={algorithm} label={algorithm} value={hashes[algorithm]} />
				))}
			</div>
		</section>
	);
}
