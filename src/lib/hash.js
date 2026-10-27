// Web Crypto has no MD5, so only the SHA family is offered.
export const HASH_ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

export async function hashText(text, algorithm) {
	const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));

	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
