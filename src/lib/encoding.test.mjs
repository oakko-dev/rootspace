import assert from "node:assert/strict";
import test from "node:test";
import { decodeBase64, encodeBase64, transformText } from "./encoding.js";

test("round-trips UTF-8 text through Base64", () => {
	assert.equal(encodeBase64("สวัสดี rootspace"), "4Liq4Lin4Lix4Liq4LiU4Li1IHJvb3RzcGFjZQ==");
	assert.equal(decodeBase64("4Liq4Lin4Lix4Liq4LiU4Li1IHJvb3RzcGFjZQ"), "สวัสดี rootspace");
});

test("decodes base64url without padding", () => {
	assert.equal(decodeBase64("eyJhIjoiPz4ifQ"), '{"a":"?>"}');
});

test("encodes and decodes URL components", () => {
	assert.deepEqual(transformText("url", "encode", "a b&c=ไทย"), {
		ok: true,
		output: "a%20b%26c%3D%E0%B9%84%E0%B8%97%E0%B8%A2",
	});
	assert.equal(transformText("url", "decode", "a%20b").output, "a b");
});

test("escapes and unescapes HTML entities", () => {
	assert.equal(
		transformText("html", "encode", `<a href="x">'&'</a>`).output,
		"&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
	);
	assert.equal(
		transformText("html", "decode", "&lt;b&gt; &#x1F600; &#65; &copy;").output,
		"<b> 😀 A &copy;",
	);
});

test("reports invalid input instead of throwing", () => {
	assert.deepEqual(transformText("base64", "decode", "@@@"), {
		ok: false,
		error: "Input is not valid Base64.",
	});
	assert.equal(transformText("url", "decode", "%E0%A4%A").ok, false);
});
