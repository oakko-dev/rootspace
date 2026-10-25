import { redirect } from "next/navigation";
import NotesTool from "@/components/notes-tool";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = {
	title: "Notes | Rootspace",
	description: "Write and keep personal notes.",
};

export const dynamic = "force-dynamic";

export default async function NotesPage() {
	if (!(await getCurrentUser())) {
		redirect("/login?next=/notes");
	}
	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				eyebrow="rootspace / notes"
				title="Notes"
				description="Plain-text notes, saved to your account as you type."
			/>
			<NotesTool />
		</div>
	);
}
