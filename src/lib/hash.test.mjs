import assert from "node:assert/strict";
import test from "node:test";
import { hashText } from "./hash.js";

test("matches the standard SHA test vectors for 'abc'", async () => {
	assert.equal(await hashText("abc", "SHA-1"), "a9993e364706816aba3e25717850c26c9cd0d89d");
	assert.equal(
		await hashText("abc", "SHA-256"),
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
	);
});

test("hashes UTF-8 text", async () => {
	const digest = await hashText("ไทย", "SHA-512");

	assert.equal(digest.length, 128);
});
