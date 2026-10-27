// 64 URL-safe characters, so `byte % 64` picks one without modulo bias.
const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const NANOID_LENGTH = 21;

export const MIN_ID_COUNT = 1;
export const MAX_ID_COUNT = 100;

export const ID_TYPES = [
	{ value: "uuid-v4", label: "UUID v4 / GUID" },
	{ value: "uuid-v7", label: "UUID v7" },
	{ value: "nanoid", label: "Nano ID" },
];

function randomBytes(length) {
	return crypto.getRandomValues(new Uint8Array(length));
}

function formatUuid(bytes) {
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUuidV7(now = Date.now(), getRandomBytes = randomBytes) {
	const bytes = getRandomBytes(16);
	let timestamp = now;

	// First 48 bits are the Unix timestamp in milliseconds, big-endian.
	for (let index = 5; index >= 0; index -= 1) {
		bytes[index] = timestamp % 256;
		timestamp = Math.floor(timestamp / 256);
	}

	// Version 7 in the high nibble of byte 6, RFC 9562 variant (0b10) in the top bits of byte 8.
	bytes[6] = (bytes[6] % 16) + 0x70;
	bytes[8] = (bytes[8] % 64) + 0x80;

	return formatUuid(bytes);
}

export function generateNanoId(getRandomBytes = randomBytes) {
	return Array.from(
		getRandomBytes(NANOID_LENGTH),
		(byte) => NANOID_ALPHABET[byte % NANOID_ALPHABET.length],
	).join("");
}

function generateId(type) {
	if (type === "uuid-v4") {
		return crypto.randomUUID();
	}

	if (type === "uuid-v7") {
		return generateUuidV7();
	}

	if (type === "nanoid") {
		return generateNanoId();
	}

	throw new Error(`Unknown ID type: ${type}`);
}

export function generateIds({
	type = "uuid-v4",
	count = 1,
	uppercase = false,
	dashes = true,
	braces = false,
} = {}) {
	if (!Number.isInteger(count) || count < MIN_ID_COUNT || count > MAX_ID_COUNT) {
		throw new Error(`Count must be a whole number from ${MIN_ID_COUNT} to ${MAX_ID_COUNT}.`);
	}

	// Format options only apply to UUIDs; Nano IDs are case-sensitive and may contain "-".
	const isUuid = type !== "nanoid";

	return Array.from({ length: count }, () => {
		let id = generateId(type);

		if (!isUuid) {
			return id;
		}

		if (!dashes) {
			id = id.replaceAll("-", "");
		}

		if (uppercase) {
			id = id.toUpperCase();
		}

		// Registry-style GUID, e.g. {3F2504E0-4F89-41D3-9A0C-0305E82C3301}.
		return braces ? `{${id}}` : id;
	});
}
