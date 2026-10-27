import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER_SETS, generatePassword, generateToken } from "./password-generator.js";

test("includes at least one character from every chosen set", () => {
	for (let run = 0; run < 50; run += 1) {
		const password = generatePassword({ length: 8, sets: ["lowercase", "digits", "symbols"] });

		assert.equal(password.length, 8);
		for (const key of ["lowercase", "digits", "symbols"]) {
			const { chars } = CHARACTER_SETS.find((set) => set.key === key);
			assert.ok(
				[...password].some((char) => chars.includes(char)),
				`${key} in ${password}`,
			);
		}
		assert.doesNotMatch(password, /[A-Z]/u);
	}
});

test("rejects bad lengths and empty set lists", () => {
	assert.throws(() => generatePassword({ length: 3 }), /Length must be/u);
	assert.throws(() => generatePassword({ length: 129 }), /Length must be/u);
	assert.throws(() => generatePassword({ sets: [] }), {
		message: "Pick at least one character set.",
	});
});

test("generates hex and base64url tokens of the requested size", () => {
	assert.match(generateToken(16, "hex"), /^[\da-f]{32}$/u);
	assert.match(generateToken(32, "base64url"), /^[\w-]{43}$/u);
});
