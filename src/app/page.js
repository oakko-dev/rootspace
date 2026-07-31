import { redirect } from "next/navigation";
import BookmarkStartPageTool from "@/components/bookmark-start-page-tool";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Bookmark Start Page | Rootspace",
  description: "A synced bookmark board for your browser start page.",
};

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/");
  }

  return <BookmarkStartPageTool currentUser={currentUser} />;
}
