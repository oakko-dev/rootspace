import assert from "node:assert/strict";
import test from "node:test";
import { formatJson } from "./json-formatter.js";

test("pretty prints valid JSON with two-space indentation", () => {
	const result = formatJson('{"name":"oak","active":true}', "pretty");

	assert.deepEqual(result, {
		ok: true,
		output: '{\n  "name": "oak",\n  "active": true\n}',
	});
});

test("minifies valid pretty JSON into one line", () => {
	const result = formatJson('{\n  "name": "oak",\n  "active": true\n}', "minify");

	assert.deepEqual(result, {
		ok: true,
		output: '{"name":"oak","active":true}',
	});
});

test("returns a validation error for empty input", () => {
	const result = formatJson("   ", "pretty");

	assert.deepEqual(result, {
		ok: false,
		error: "Enter JSON to format.",
	});
});

test("returns a validation error for invalid JSON", () => {
	const result = formatJson('{"name": }', "minify");

	assert.deepEqual(result, {
		ok: false,
		error: "Could not parse that JSON.",
	});
});
