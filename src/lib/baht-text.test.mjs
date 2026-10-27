import assert from "node:assert/strict";
import test from "node:test";
import { toBahtText } from "./baht-text.js";

const CASES = [
	["0", "ศูนย์บาทถ้วน"],
	["1", "หนึ่งบาทถ้วน"],
	["11", "สิบเอ็ดบาทถ้วน"],
	["21", "ยี่สิบเอ็ดบาทถ้วน"],
	["101", "หนึ่งร้อยเอ็ดบาทถ้วน"],
	["1,250.50", "หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์"],
	["0.01", "หนึ่งสตางค์"],
	["0.21", "ยี่สิบเอ็ดสตางค์"],
	["1000000", "หนึ่งล้านบาทถ้วน"],
	["1000001", "หนึ่งล้านเอ็ดบาทถ้วน"],
	["21000000", "ยี่สิบเอ็ดล้านบาทถ้วน"],
	["1.999", "สองบาทถ้วน"],
	["-5", "ลบห้าบาทถ้วน"],
];

test("reads amounts in Thai baht", () => {
	for (const [input, expected] of CASES) {
		assert.deepEqual(toBahtText(input), { ok: true, text: expected }, input);
	}
});

test("rejects text that is not an amount", () => {
	assert.equal(toBahtText("12a").ok, false);
	assert.equal(toBahtText("").ok, false);
	assert.equal(toBahtText("99999999999999999999").ok, false);
});
