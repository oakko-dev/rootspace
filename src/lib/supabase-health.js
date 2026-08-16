function getSupabaseConfig(env = process.env) {
	const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

	return {
		url,
		anonKey,
		configured: Boolean(url && anonKey),
	};
}

export async function checkSupabaseHealth({ env = process.env, fetchImpl = fetch } = {}) {
	const { url, anonKey, configured } = getSupabaseConfig(env);

	if (!configured) {
		return {
			status: "not-configured",
			ok: false,
			message: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
		};
	}

	try {
		const headers = {
			apikey: anonKey,
		};

		// ponytail: this proves project reachability without assuming any table/RPC exists; upgrade to a real data probe once the app owns persisted tables.
		const response = await fetchImpl(new URL("/auth/v1/settings", url).toString(), {
			method: "GET",
			headers,
			cache: "no-store",
		});

		if (response.ok) {
			return {
				status: "connected",
				ok: true,
				message: "Supabase project API reachable.",
			};
		}

		return {
			status: "error",
			ok: false,
			message:
				response.status === 401
					? "Supabase returned 401 Unauthorized. Check that NEXT_PUBLIC_SUPABASE_ANON_KEY is your project's anon or publishable key, not a secret key, and that the value has no extra spaces."
					: `Supabase responded with ${response.status} ${response.statusText}.`,
		};
	} catch (error) {
		return {
			status: "error",
			ok: false,
			message: error instanceof Error ? error.message : "Unknown error.",
		};
	}
}
