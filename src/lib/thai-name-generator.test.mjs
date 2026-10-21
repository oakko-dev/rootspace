import assert from "node:assert/strict";
import test from "node:test";
import { generateThaiName } from "./thai-name-generator.js";

const sampleData = {
	lastname: [
		{ th: "ใจดี", en: "Jaidee" },
		{ th: "แสงทอง", en: "Saengthong" },
	],
	firstnameFemale: [{ th: "มะลิ", en: "Mali" }],
	firstnameMale: [{ th: "นนท์", en: "Non" }],
	nicknameFemale: [{ th: "มิ้น", en: "Mint" }],
	nicknameMale: [{ th: "นัท", en: "Nat" }],
};

test("generates a female thai name when random picks the female branch", () => {
	const result = generateThaiName(sampleData, () => 0);

	assert.deepEqual(result, {
		citizenNumber: "0000000000001",
		gender: "female",
		firstname: "มะลิ",
		lastname: "ใจดี",
		nickname: "มิ้น",
		fullName: "มะลิ ใจดี",
		displayName: "มะลิ ใจดี (มิ้น)",
		firstnameEn: "Mali",
		lastnameEn: "Jaidee",
		nicknameEn: "Mint",
		fullNameEn: "Mali Jaidee",
		displayNameEn: "Mali Jaidee (Mint)",
	});
});

test("generates a male thai name when random picks the male branch", () => {
	const result = generateThaiName(sampleData, () => 0.99);

	assert.deepEqual(result, {
		citizenNumber: "9999999999994",
		gender: "male",
		firstname: "นนท์",
		lastname: "แสงทอง",
		nickname: "นัท",
		fullName: "นนท์ แสงทอง",
		displayName: "นนท์ แสงทอง (นัท)",
		firstnameEn: "Non",
		lastnameEn: "Saengthong",
		nicknameEn: "Nat",
		fullNameEn: "Non Saengthong",
		displayNameEn: "Non Saengthong (Nat)",
	});
});

test("generates a 13 digit thai citizen number with a valid checksum", () => {
	const result = generateThaiName(sampleData, () => 0.42);
	const digits = [...result.citizenNumber].map(Number);
	const checksumBase = digits
		.slice(0, 12)
		.reduce((sum, digit, index) => sum + digit * (13 - index), 0);
	const checksum = (11 - (checksumBase % 11)) % 10;

	assert.match(result.citizenNumber, /^\d{13}$/u);
	assert.equal(digits[12], checksum);
});

test("throws when a required list is missing", () => {
	assert.throws(() => generateThaiName({ ...sampleData, lastname: [] }), {
		message: "Missing required thai name data.",
	});
});

test("every entry in the name list has a thai and english spelling", async () => {
	const { readFile } = await import("node:fs/promises");
	const data = JSON.parse(
		await readFile(new URL("../../public/thai-names.json", import.meta.url), "utf-8"),
	);

	for (const [list, entries] of Object.entries(data)) {
		for (const entry of entries) {
			assert.ok(entry.th?.trim() && entry.en?.trim(), `${list}: ${JSON.stringify(entry)}`);
		}
	}
});
