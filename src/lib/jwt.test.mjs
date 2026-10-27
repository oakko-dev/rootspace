import assert from "node:assert/strict";
import test from "node:test";
import { decodeJwt } from "./jwt.js";

// Header {"alg":"HS256","typ":"JWT"}, payload {"sub":"oak","iat":1704164645,"exp":1704168245}.
const TOKEN =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvYWsiLCJpYXQiOjE3MDQxNjQ2NDUsImV4cCI6MTcwNDE2ODI0NX0.signature";

test("decodes header, payload and time claims", () => {
	const result = decodeJwt(TOKEN, 1_704_164_645_000);

	assert.equal(result.ok, true);
	assert.deepEqual(result.header, { alg: "HS256", typ: "JWT" });
	assert.equal(result.payload.sub, "oak");
	assert.equal(result.signature, "signature");
	assert.deepEqual(result.times, [
		{ key: "iat", label: "Issued at", iso: "2024-01-02T03:04:05.000Z" },
		{ key: "exp", label: "Expires", iso: "2024-01-02T04:04:05.000Z" },
	]);
	assert.equal(result.expired, false);
});

test("flags expired tokens", () => {
	assert.equal(decodeJwt(TOKEN, 1_704_168_245_000).expired, true);
});

test("rejects malformed tokens", () => {
	assert.equal(decodeJwt("abc.def").ok, false);
	assert.deepEqual(decodeJwt("bm90IGpzb24.e30.sig"), {
		ok: false,
		error: "The header is not valid base64url JSON.",
	});
});
