export const ENCODINGS = [
	{ value: "base64", label: "Base64" },
	{ value: "url", label: "URL" },
	{ value: "html", label: "HTML entities" },
];

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const HTML_NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const HTML_ESCAPE_PATTERN = /[&<>"']/gu;
const HTML_ENTITY_PATTERN = /&(?<entity>#x[\da-f]+|#\d+|[a-z]+);/giu;

export function bytesToBase64(bytes) {
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCodePoint(byte);
	}

	return btoa(binary);
}

export function encodeBase64(text) {
	return bytesToBase64(new TextEncoder().encode(text));
}

// Accepts standard and base64url alphabets, with or without padding.
export function decodeBase64(text) {
	const normalized = text.replaceAll("-", "+").replaceAll("_", "/");
	const bytes = Uint8Array.from(atob(normalized), (char) => char.codePointAt(0));

	return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function encodeHtml(text) {
	return text.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPES[char]);
}

// shortcut: decodes numeric entities and a few common named ones, not the full HTML entity list.
function decodeHtml(text) {
	return text.replace(HTML_ENTITY_PATTERN, (match, entity) => {
		if (entity.startsWith("#")) {
			const isHex = entity[1].toLowerCase() === "x";
			const radix = isHex ? 16 : 10;
			const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), radix);

			return codePoint <= 0x10_ff_ff ? String.fromCodePoint(codePoint) : match;
		}

		return HTML_NAMED_ENTITIES[entity.toLowerCase()] ?? match;
	});
}

const TRANSFORMS = {
	base64: { encode: encodeBase64, decode: (text) => decodeBase64(text.trim()) },
	url: { encode: encodeURIComponent, decode: decodeURIComponent },
	html: { encode: encodeHtml, decode: decodeHtml },
};

export function transformText(encoding, direction, text) {
	const transform = TRANSFORMS[encoding]?.[direction];

	if (!transform) {
		return { ok: false, error: `Unknown transform: ${encoding} ${direction}.` };
	}

	try {
		return { ok: true, output: transform(text) };
	} catch {
		const { label } = ENCODINGS.find((item) => item.value === encoding);

		return { ok: false, error: `Input is not valid ${label}.` };
	}
}
