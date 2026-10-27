"use client";

import { useMemo, useState } from "react";
import CopyField from "@/components/copy-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decodeJwt } from "@/lib/jwt";

export default function JwtDecoderTool() {
	const [token, setToken] = useState("");
	const result = useMemo(() => (token.trim() ? decodeJwt(token) : null), [token]);

	return (
		<section className="grid gap-5 lg:grid-cols-[360px_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>JWT decoder</CardTitle>
					<CardDescription>
						Reads the header and payload. The signature is not verified.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="jwt-input">Token</Label>
						<Textarea
							id="jwt-input"
							value={token}
							onChange={(event) => setToken(event.target.value)}
							className="min-h-40 break-all font-mono"
							placeholder="eyJhbGciOi..."
						/>
					</div>

					{result && !result.ok ? <Alert variant="warning">{result.error}</Alert> : null}
					{result?.ok && result.expired !== null ? (
						<Badge variant={result.expired ? "destructive" : "success"}>
							{result.expired ? "Expired" : "Not expired"}
						</Badge>
					) : null}
				</CardContent>
			</Card>

			{result?.ok ? (
				<div className="grid content-start gap-3">
					<CopyField label="Header" value={JSON.stringify(result.header, null, 2)} />
					<CopyField label="Payload" value={JSON.stringify(result.payload, null, 2)} />
					{result.times.map((claim) => (
						<CopyField key={claim.key} label={`${claim.label} (${claim.key})`} value={claim.iso} />
					))}
				</div>
			) : null}
		</section>
	);
}
