import { after, NextResponse } from "next/server";
import {
  backfillBookmarkFavicons,
  BookmarkBoardError,
  executeBookmarkBoardAction,
  loadBookmarkBoard,
  resolveBookmarkBoardContext,
} from "@/lib/bookmark-board-api";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

function errorResponse(error) {
  const status = error instanceof BookmarkBoardError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Bookmark board request failed.";
  return NextResponse.json({ message }, { status });
}

async function getAuthenticatedContext() {
  return resolveBookmarkBoardContext(getCurrentUser, createSupabaseServerClient);
}

export async function GET() {
  try {
    const context = await getAuthenticatedContext();

    const board = await loadBookmarkBoard(context.supabase, context.user.id);
    if (board.missingFaviconBookmarks.length > 0) {
      after(() =>
        backfillBookmarkFavicons(
          context.supabase,
          context.user.id,
          board.missingFaviconBookmarks,
        ).catch(() => undefined),
      );
    }

    return NextResponse.json(
      {
        version: board.version,
        userId: board.userId,
        collections: board.collections,
        bookmarks: board.bookmarks,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const context = await getAuthenticatedContext();

    let payload;
    try {
      payload = await request.json();
    } catch {
      throw new BookmarkBoardError("Invalid bookmark board request.", 400);
    }
    const result = await executeBookmarkBoardAction(context.supabase, context.user.id, payload);
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
