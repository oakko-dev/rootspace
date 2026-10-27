import { bytesToBase64 } from "./encoding.js";

export const CHARACTER_SETS = [
	{ key: "lowercase", label: "a-z", chars: "abcdefghijklmnopqrstuvwxyz" },
	{ key: "uppercase", label: "A-Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
	{ key: "digits", label: "0-9", chars: "0123456789" },
	{ key: "symbols", label: "Symbols", chars: "!@#$%^&*()-_=+[]{};:,.?/" },
];

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;
export const TOKEN_BYTE_LENGTHS = [16, 32, 64];

const UINT32_RANGE = 2 ** 32;

// Unbiased integer in [0, max) using rejection sampling.
function randomInt(max) {
	const limit = UINT32_RANGE - (UINT32_RANGE % max);
	const buffer = new Uint32Array(1);

	do {
		crypto.getRandomValues(buffer);
	} while (buffer[0] >= limit);

	return buffer[0] % max;
}

function pick(chars) {
	return chars[randomInt(chars.length)];
}

export function generatePassword({
	length = 20,
	sets = ["lowercase", "uppercase", "digits"],
} = {}) {
	const chosen = CHARACTER_SETS.filter((set) => sets.includes(set.key));

	if (chosen.length === 0) {
		throw new Error("Pick at least one character set.");
	}

	if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
		throw new Error(
			`Length must be a whole number from ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH}.`,
		);
	}

	const allChars = chosen.map((set) => set.chars).join("");
	// One character from every chosen set, the rest from all of them, then shuffle.
	const chars = [
		...chosen.map((set) => pick(set.chars)),
		...Array.from({ length: length - chosen.length }, () => pick(allChars)),
	];

	for (let index = chars.length - 1; index > 0; index -= 1) {
		const swapIndex = randomInt(index + 1);
		[chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
	}

	return chars.join("");
}

export function generateToken(byteLength = 32, format = "hex") {
	const bytes = crypto.getRandomValues(new Uint8Array(byteLength));

	if (format === "base64url") {
		return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
	}

	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
