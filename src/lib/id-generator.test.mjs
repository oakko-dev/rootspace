import assert from "node:assert/strict";
import test from "node:test";
import { generateIds, generateNanoId, generateUuidV7 } from "./id-generator.js";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const NANOID_PATTERN = /^[\w-]{21}$/u;

test("generates the requested number of unique v4 UUIDs", () => {
	const ids = generateIds({ type: "uuid-v4", count: 20 });

	assert.equal(ids.length, 20);
	assert.equal(new Set(ids).size, 20);
	for (const id of ids) {
		assert.match(id, UUID_V4_PATTERN);
	}
});

test("applies uppercase and no-dash options to UUIDs", () => {
	const [id] = generateIds({ type: "uuid-v4", uppercase: true, dashes: false });

	assert.match(id, /^[0-9A-F]{32}$/u);
});

test("wraps UUIDs in braces for GUID format", () => {
	const [id] = generateIds({ type: "uuid-v4", uppercase: true, braces: true });

	assert.match(id, /^\{[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\}$/u);
});

test("encodes the timestamp, version and variant in v7 UUIDs", () => {
	const id = generateUuidV7(0x01_8f_3c_2a_5b_6c, (length) => new Uint8Array(length).fill(0xff));

	assert.equal(id, "018f3c2a-5b6c-7fff-bfff-ffffffffffff");
	assert.match(generateIds({ type: "uuid-v7" })[0], UUID_V7_PATTERN);
});

test("v7 UUIDs sort by creation time", () => {
	const earlier = generateUuidV7(1000);
	const later = generateUuidV7(2000);

	assert.ok(earlier < later);
});

test("generates 21 character url-safe nano IDs and ignores UUID options", () => {
	assert.equal(
		generateNanoId((length) => new Uint8Array(length)),
		"u".repeat(21),
	);

	const [id] = generateIds({ type: "nanoid", uppercase: true, dashes: false, braces: true });
	assert.match(id, NANOID_PATTERN);
});

test("rejects counts outside the allowed range and unknown types", () => {
	for (const count of [0, 101, 1.5, Number.NaN]) {
		assert.throws(() => generateIds({ count }), /Count must be a whole number/u);
	}
	assert.throws(() => generateIds({ type: "ulid" }), { message: "Unknown ID type: ulid" });
});
