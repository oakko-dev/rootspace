import assert from "node:assert/strict";
import test from "node:test";
import { splitNoteBlocks } from "./note-blocks.js";

test("splits text and fenced code blocks with language", () => {
	assert.deepEqual(splitNoteBlocks("intro\n```js\nconst a = 1;\n```\noutro"), [
		{ type: "text", content: "intro" },
		{ type: "code", lang: "js", content: "const a = 1;" },
		{ type: "text", content: "outro" },
	]);
});

test("keeps an unclosed fence as code to the end", () => {
	assert.deepEqual(splitNoteBlocks("```\nline 1\nline 2"), [
		{ type: "code", lang: "", content: "line 1\nline 2" },
	]);
});

test("returns plain text unchanged when there is no fence", () => {
	assert.deepEqual(splitNoteBlocks("a\n\nb"), [{ type: "text", content: "a\n\nb" }]);
});
