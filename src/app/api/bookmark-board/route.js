import { after, NextResponse } from "next/server";
import {
	backfillBookmarkFavicons,
	BookmarkBoardError,
	createBookmarkBoardPayload,
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

function getAuthenticatedContext() {
	return resolveBookmarkBoardContext(getCurrentUser, createSupabaseServerClient);
}

export async function GET() {
	try {
		const context = await getAuthenticatedContext();

		const board = await loadBookmarkBoard(context.supabase, context.user.id);
		if (board.missingFaviconBookmarks.length > 0) {
			after(async () => {
				try {
					await backfillBookmarkFavicons(
						context.supabase,
						context.user.id,
						board.missingFaviconBookmarks,
					);
				} catch {
					// Favicon backfill is best effort and must not affect the response.
				}
			});
		}

		return NextResponse.json(createBookmarkBoardPayload(board, context.user), {
			headers: { "cache-control": "private, no-store" },
		});
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
