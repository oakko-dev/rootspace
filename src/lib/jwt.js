import { decodeBase64 } from "./encoding.js";

const TIME_CLAIMS = [
	{ key: "iat", label: "Issued at" },
	{ key: "nbf", label: "Not before" },
	{ key: "exp", label: "Expires" },
];

function decodeJsonPart(part, name) {
	try {
		return JSON.parse(decodeBase64(part));
	} catch {
		throw new Error(`The ${name} is not valid base64url JSON.`);
	}
}

// Decodes only; the signature is never verified.
export function decodeJwt(token, now = Date.now()) {
	const parts = String(token ?? "")
		.trim()
		.split(".");

	if (parts.length !== 3 || parts.some((part) => !part)) {
		return { ok: false, error: "A JWT has three non-empty parts separated by dots." };
	}

	try {
		const header = decodeJsonPart(parts[0], "header");
		const payload = decodeJsonPart(parts[1], "payload");
		const times = TIME_CLAIMS.filter(({ key }) => typeof payload[key] === "number").map(
			({ key, label }) => ({ key, label, iso: new Date(payload[key] * 1000).toISOString() }),
		);
		const expired = typeof payload.exp === "number" ? payload.exp * 1000 <= now : null;

		return { ok: true, header, payload, signature: parts[2], times, expired };
	} catch (error) {
		return { ok: false, error: error.message };
	}
}
