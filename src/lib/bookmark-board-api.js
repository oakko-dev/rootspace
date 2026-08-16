import { z } from "zod";
import { getBookmarkFaviconUrl } from "./bookmark-start-page.js";

export const BOOKMARK_TABLES = {
	collections: "rootspace_bookmark_collections",
	bookmarks: "rootspace_bookmarks",
};

const collectionSchema = z.object({
	id: z.string().trim().min(1).max(200),
	name: z.string().trim().min(1).max(200),
	description: z.string().max(2000).default(""),
	color: z.string().trim().min(1).max(40),
	position: z.number().int().min(0),
});

const bookmarkSchema = z.object({
	id: z.string().trim().min(1).max(200),
	collectionId: z.string().trim().min(1).max(200),
	title: z.string().trim().min(1).max(500),
	url: z.url().max(4000),
	faviconUrl: z.string().max(4000).default(""),
	description: z.string().max(4000).default(""),
	position: z.number().int().min(0),
	isFavorite: z.boolean().default(false),
});

const bookmarkBoardActionSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("upsert-collections"),
		collections: z.array(collectionSchema).max(500),
	}),
	z.object({
		action: z.literal("delete-collection"),
		collectionId: z.string().trim().min(1).max(200),
		collections: z.array(collectionSchema).max(500),
	}),
	z.object({ action: z.literal("upsert-bookmarks"), bookmarks: z.array(bookmarkSchema).max(5000) }),
	z.object({
		action: z.literal("delete-bookmark"),
		bookmarkId: z.string().trim().min(1).max(200),
	}),
	z.object({
		action: z.literal("upsert-board"),
		collections: z.array(collectionSchema).max(500),
		bookmarks: z.array(bookmarkSchema).max(5000),
	}),
]);

export class BookmarkBoardError extends Error {
	constructor(message, status = 500) {
		super(message);
		this.name = "BookmarkBoardError";
		this.status = status;
	}
}

export function parseBookmarkBoardAction(value) {
	const result = bookmarkBoardActionSchema.safeParse(value);
	if (!result.success) {
		throw new BookmarkBoardError("Invalid bookmark board request.", 400);
	}
	return result.data;
}

export async function resolveBookmarkBoardContext(getUser, createClient) {
	const user = await getUser();
	if (!user) {
		throw new BookmarkBoardError("Authentication required.", 401);
	}
	return { user, supabase: await createClient() };
}

function isMissingTableError(error) {
	return (
		error?.code === "PGRST205" ||
		error?.code === "42P01" ||
		error?.message?.includes("relation") ||
		error?.message?.includes("does not exist")
	);
}

function throwForDatabaseError(error) {
	if (!error) {
		return;
	}
	if (isMissingTableError(error)) {
		throw new BookmarkBoardError(
			"Missing bookmark start page tables. Run the rootspace_bookmark_* SQL from script.sql in Supabase.",
			503,
		);
	}
	throw new BookmarkBoardError(error.message || "Bookmark database request failed.");
}

function collectionFromDb(row) {
	return {
		id: row.id,
		name: row.name,
		description: row.description || "",
		color: row.color || "#7dd3fc",
		position: Number(row.position || 0),
	};
}

function bookmarkFromDb(row) {
	return {
		id: row.id,
		collectionId: row.collection_id,
		title: row.title,
		url: row.url,
		faviconUrl: row.favicon_url || getBookmarkFaviconUrl(row.url),
		description: row.description || "",
		position: Number(row.position || 0),
		isFavorite: Boolean(row.is_favorite),
	};
}

function collectionToDb(userId, collection) {
	return {
		user_id: userId,
		id: collection.id,
		name: collection.name,
		description: collection.description || "",
		color: collection.color || "#7dd3fc",
		position: Number(collection.position || 0),
		updated_at: new Date().toISOString(),
	};
}

function bookmarkToDb(userId, bookmark) {
	return {
		user_id: userId,
		id: bookmark.id,
		collection_id: bookmark.collectionId,
		title: bookmark.title,
		url: bookmark.url,
		favicon_url: bookmark.faviconUrl || getBookmarkFaviconUrl(bookmark.url),
		description: bookmark.description || "",
		position: Number(bookmark.position || 0),
		is_favorite: Boolean(bookmark.isFavorite),
		updated_at: new Date().toISOString(),
	};
}

async function upsertCollections(supabase, userId, collections) {
	if (collections.length === 0) {
		return;
	}
	const { error } = await supabase
		.from(BOOKMARK_TABLES.collections)
		.upsert(collections.map((collection) => collectionToDb(userId, collection)));
	throwForDatabaseError(error);
}

async function upsertBookmarks(supabase, userId, bookmarks) {
	if (bookmarks.length === 0) {
		return;
	}
	const { error } = await supabase
		.from(BOOKMARK_TABLES.bookmarks)
		.upsert(bookmarks.map((bookmark) => bookmarkToDb(userId, bookmark)));
	throwForDatabaseError(error);
}

export async function loadBookmarkBoard(supabase, userId, createId = () => crypto.randomUUID()) {
	const [collectionsResult, bookmarksResult] = await Promise.all([
		supabase
			.from(BOOKMARK_TABLES.collections)
			.select("id,name,description,color,position")
			.eq("user_id", userId)
			.order("position", { ascending: true }),
		supabase
			.from(BOOKMARK_TABLES.bookmarks)
			.select("id,collection_id,title,url,favicon_url,description,position,is_favorite")
			.eq("user_id", userId)
			.order("position", { ascending: true }),
	]);

	throwForDatabaseError(collectionsResult.error);
	throwForDatabaseError(bookmarksResult.error);

	let collections = (collectionsResult.data || []).map(collectionFromDb);
	if (collections.length === 0) {
		const inbox = {
			id: createId(),
			name: "Inbox",
			description: "Drop new links here before sorting them.",
			color: "#7dd3fc",
			position: 0,
		};
		await upsertCollections(supabase, userId, [inbox]);
		collections = [inbox];
	}

	const rawBookmarks = bookmarksResult.data || [];
	return {
		version: 1,
		userId,
		collections,
		bookmarks: rawBookmarks.map(bookmarkFromDb),
		missingFaviconBookmarks: rawBookmarks
			.filter((bookmark) => !bookmark.favicon_url)
			.map(bookmarkFromDb),
	};
}

export async function backfillBookmarkFavicons(supabase, userId, bookmarks) {
	await upsertBookmarks(supabase, userId, bookmarks);
}

export function createBookmarkBoardPayload(board, user) {
	return {
		version: board.version,
		userId: board.userId,
		user: {
			id: user.id,
			email: user.email ?? null,
		},
		collections: board.collections,
		bookmarks: board.bookmarks,
	};
}

export async function executeBookmarkBoardAction(supabase, userId, rawAction) {
	const action = parseBookmarkBoardAction(rawAction);

	switch (action.action) {
		case "upsert-collections": {
			await upsertCollections(supabase, userId, action.collections);
			break;
		}
		case "delete-collection": {
			const { error } = await supabase
				.from(BOOKMARK_TABLES.collections)
				.delete()
				.eq("user_id", userId)
				.eq("id", action.collectionId);
			throwForDatabaseError(error);
			await upsertCollections(supabase, userId, action.collections);
			break;
		}
		case "upsert-bookmarks": {
			await upsertBookmarks(supabase, userId, action.bookmarks);
			break;
		}
		case "delete-bookmark": {
			const { error } = await supabase
				.from(BOOKMARK_TABLES.bookmarks)
				.delete()
				.eq("user_id", userId)
				.eq("id", action.bookmarkId);
			throwForDatabaseError(error);
			break;
		}
		case "upsert-board": {
			await upsertCollections(supabase, userId, action.collections);
			await upsertBookmarks(supabase, userId, action.bookmarks);
			break;
		}
		default: {
			throw new BookmarkBoardError("Unsupported bookmark board action.", 400);
		}
	}

	return { ok: true };
}
