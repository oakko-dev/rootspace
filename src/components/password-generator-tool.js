"use client";

import { useState } from "react";
import CopyField from "@/components/copy-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	CHARACTER_SETS,
	generatePassword,
	generateToken,
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	TOKEN_BYTE_LENGTHS,
} from "@/lib/password-generator";

const TOKEN_FORMATS = ["hex", "base64url"];

function OptionButtons({ legend, onChange, options, value }) {
	return (
		<fieldset className="flex flex-wrap items-center gap-2">
			<legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
			{options.map((option) => (
				<Button
					key={option}
					type="button"
					size="sm"
					variant={option === value ? "default" : "outline"}
					aria-pressed={option === value}
					onClick={() => onChange(option)}
				>
					{option}
				</Button>
			))}
		</fieldset>
	);
}

export default function PasswordGeneratorTool() {
	const [length, setLength] = useState("20");
	const [sets, setSets] = useState(["lowercase", "uppercase", "digits", "symbols"]);
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [tokenBytes, setTokenBytes] = useState(32);
	const [tokenFormat, setTokenFormat] = useState("hex");
	const [token, setToken] = useState("");

	function toggleSet(key, checked) {
		setSets((current) => (checked ? [...current, key] : current.filter((item) => item !== key)));
	}

	function handleGeneratePassword(event) {
		event.preventDefault();

		try {
			setPassword(generatePassword({ length: Number(length), sets }));
			setError("");
		} catch (generateError) {
			setError(generateError.message);
		}
	}

	return (
		<section className="grid gap-5 lg:grid-cols-2">
			<Card className="self-start">
				<CardHeader>
					<CardTitle>Password</CardTitle>
					<CardDescription>Uses at least one character from every set you pick.</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleGeneratePassword} className="space-y-4">
						<div className="flex flex-wrap items-end gap-4">
							<div className="space-y-2">
								<Label htmlFor="password-length">Length</Label>
								<Input
									id="password-length"
									type="number"
									inputMode="numeric"
									min={MIN_PASSWORD_LENGTH}
									max={MAX_PASSWORD_LENGTH}
									value={length}
									onChange={(event) => setLength(event.target.value)}
									className="w-24"
								/>
							</div>
							{CHARACTER_SETS.map((set) => (
								<label
									key={set.key}
									className="flex min-h-10 items-center gap-2 text-sm text-foreground"
								>
									<input
										type="checkbox"
										checked={sets.includes(set.key)}
										onChange={(event) => toggleSet(set.key, event.target.checked)}
										className="h-4 w-4 accent-primary"
									/>
									{set.label}
								</label>
							))}
						</div>
						<Button type="submit">Generate password</Button>
						{error ? <Alert variant="warning">{error}</Alert> : null}
						<CopyField label="Password" value={password} />
					</form>
				</CardContent>
			</Card>

			<Card className="self-start">
				<CardHeader>
					<CardTitle>Token</CardTitle>
					<CardDescription>Random bytes for API keys, secrets, and session tokens.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<OptionButtons
						legend="Bytes"
						options={TOKEN_BYTE_LENGTHS}
						value={tokenBytes}
						onChange={setTokenBytes}
					/>
					<OptionButtons
						legend="Format"
						options={TOKEN_FORMATS}
						value={tokenFormat}
						onChange={setTokenFormat}
					/>
					<Button type="button" onClick={() => setToken(generateToken(tokenBytes, tokenFormat))}>
						Generate token
					</Button>
					<CopyField label="Token" value={token} />
				</CardContent>
			</Card>
		</section>
	);
}
