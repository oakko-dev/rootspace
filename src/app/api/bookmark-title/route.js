import { NextResponse } from "next/server";
import {
  extractHtmlFaviconUrl,
  extractHtmlTitle,
  getBookmarkFaviconUrl,
  normalizeBookmarkUrl,
} from "@/lib/bookmark-start-page";
import { getCurrentUser } from "@/lib/supabase/server";

export async function POST(request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url;

  try {
    const body = await request.json();
    url = normalizeBookmarkUrl(body?.url);
  } catch {
    return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Rootspace bookmark title fetcher",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return NextResponse.json({ title: "", faviconUrl: getBookmarkFaviconUrl(url) });
    }

    const html = await response.text();
    const pageUrl = response.url || url;
    return NextResponse.json({
      title: extractHtmlTitle(html).slice(0, 160),
      faviconUrl: extractHtmlFaviconUrl(html, pageUrl),
    });
  } catch {
    return NextResponse.json({ title: "", faviconUrl: getBookmarkFaviconUrl(url) });
  }
}
