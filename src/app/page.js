import { redirect } from "next/navigation";
import BookmarkStartPageTool from "@/components/bookmark-start-page-tool";
import { getCurrentUser } from "@/lib/supabase/server";
import { GUEST_HOME_HREF } from "@/lib/tool-catalog";

export const metadata = {
	title: "Bookmark Start Page | Rootspace",
	description: "A synced bookmark board for your browser start page.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
	if (!(await getCurrentUser())) {
		redirect(GUEST_HOME_HREF);
	}
	return <BookmarkStartPageTool />;
}
