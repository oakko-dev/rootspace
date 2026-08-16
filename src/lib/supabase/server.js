import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

function getSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

	if (!url || !anonKey) {
		throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
	}

	return { url, anonKey };
}

export async function createSupabaseServerClient() {
	const { url, anonKey } = getSupabaseEnv();
	const cookieStore = await cookies();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// ponytail: server components can only read cookies; Server Actions and Route Handlers still write them.
				}
			},
		},
	});
}

export const getCurrentUser = cache(async () => {
	try {
		const supabase = await createSupabaseServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		return user
			? {
					id: user.id,
					email: user.email,
				}
			: null;
	} catch {
		return null;
	}
});
