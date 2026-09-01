import assert from "node:assert/strict";
import test from "node:test";
import { formatMoneyInput, parseMoneyInput } from "./money-input.js";

test("parses comma-separated and decimal money input", () => {
	assert.equal(parseMoneyInput("1,234.56"), 1234.56);
	assert.equal(parseMoneyInput("1234.5"), 1234.5);
	assert.equal(parseMoneyInput("0"), 0);
});

test("formats money with comma separators without changing numeric meaning", () => {
	assert.equal(formatMoneyInput(1_234_567.89), "1,234,567.89");
	assert.equal(formatMoneyInput("1,234.5"), "1,234.5");
});

test("returns null for empty input", () => {
	assert.equal(parseMoneyInput(""), null);
	assert.equal(parseMoneyInput("   "), null);
});

test("rejects malformed, negative, and over-precise input", () => {
	for (const value of ["1,23.45", "1.234", "1,234,", "12..34", "-1", "+1", "$10"]) {
		assert.equal(parseMoneyInput(value), null, value);
	}
	assert.equal(formatMoneyInput("not money"), "");
});

test("rejects non-finite numeric values and accepts zero", () => {
	assert.equal(parseMoneyInput(Number.NaN), null);
	assert.equal(parseMoneyInput(Number.POSITIVE_INFINITY), null);
	assert.equal(parseMoneyInput(0), 0);
});
