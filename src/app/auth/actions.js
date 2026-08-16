"use server";

import { redirect } from "next/navigation";
import { validateEmailPassword } from "@/lib/auth-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function authError(error) {
	return {
		status: "error",
		message: error instanceof Error ? error.message : "Authentication failed.",
	};
}

export async function signIn(_state, formData) {
	const validated = validateEmailPassword(formData);

	if (!validated.ok) {
		return { status: "error", message: validated.message };
	}

	try {
		const supabase = await createSupabaseServerClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: validated.email,
			password: validated.password,
		});

		if (error) {
			return { status: "error", message: error.message };
		}
	} catch (error) {
		return authError(error);
	}

	redirect("/");
}

export async function signOut() {
	const supabase = await createSupabaseServerClient();
	await supabase.auth.signOut();
	redirect("/login");
}
