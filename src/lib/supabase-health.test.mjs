import assert from "node:assert/strict";
import test from "node:test";
import { checkSupabaseHealth } from "./supabase-health.js";

test("returns not configured when Supabase env vars are missing", async () => {
	const result = await checkSupabaseHealth({
		env: {},
		fetchImpl: () => {
			throw new Error("fetch should not run");
		},
	});

	assert.equal(result.status, "not-configured");
	assert.equal(result.ok, false);
	assert.match(result.message, /NEXT_PUBLIC_SUPABASE_URL/iu);
});

test("returns connected when Supabase REST responds successfully", async () => {
	const calls = [];
	const env = {
		NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
	};

	const result = await checkSupabaseHealth({
		env,
		fetchImpl: (url, init) => {
			calls.push({ url, init });
			return {
				ok: true,
				status: 200,
				statusText: "OK",
			};
		},
	});

	assert.equal(result.status, "connected");
	assert.equal(result.ok, true);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, "https://example.supabase.co/auth/v1/settings");
	assert.equal(calls[0].init.headers.apikey, "public-anon-key");
	assert.equal("Authorization" in calls[0].init.headers, false);
});

test("does not send Authorization for publishable keys", async () => {
	const calls = [];

	const result = await checkSupabaseHealth({
		env: {
			NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
			NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_123",
		},
		fetchImpl: (url, init) => {
			calls.push({ url, init });
			return {
				ok: true,
				status: 200,
				statusText: "OK",
			};
		},
	});

	assert.equal(result.status, "connected");
	assert.equal(calls.length, 1);
	assert.equal(calls[0].init.headers.apikey, "sb_publishable_123");
	assert.equal("Authorization" in calls[0].init.headers, false);
});

test("returns error when Supabase REST responds with a failure", async () => {
	const result = await checkSupabaseHealth({
		env: {
			NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
			NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
		},
		fetchImpl: () => ({
			ok: false,
			status: 503,
			statusText: "Service Unavailable",
		}),
	});

	assert.equal(result.status, "error");
	assert.equal(result.ok, false);
	assert.match(result.message, /503/u);
});
