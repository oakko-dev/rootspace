import assert from "node:assert/strict";
import test from "node:test";
import { validateThaiCitizenId } from "./thai-citizen-id.js";

test("accepts an ID with a correct check digit and formats it", () => {
	assert.deepEqual(validateThaiCitizenId("1 1037 02071 81 1"), {
		ok: true,
		valid: true,
		expected: 1,
		formatted: "1-1037-02071-81-1",
	});
});

test("flags a wrong check digit and reports the expected one", () => {
	const result = validateThaiCitizenId("1-1037-02071-81-2");

	assert.equal(result.valid, false);
	assert.equal(result.expected, 1);
});

test("rejects input that is not 13 digits", () => {
	assert.equal(validateThaiCitizenId("12345").ok, false);
	assert.equal(validateThaiCitizenId("110370207181a").ok, false);
});
