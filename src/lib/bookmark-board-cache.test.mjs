import assert from "node:assert/strict";
import test from "node:test";
import {
	clearBookmarkBoardCache,
	getBookmarkBoardCacheKey,
	parseBookmarkBoardCache,
	readBookmarkBoardCache,
	writeBookmarkBoardCache,
} from "./bookmark-board-cache.js";

const board = {
	collections: [{ id: "inbox", name: "Inbox", description: "", color: "#7dd3fc", position: 0 }],
	bookmarks: [
		{
			id: "openai",
			collectionId: "inbox",
			title: "OpenAI",
			url: "https://openai.com/",
			faviconUrl: "https://openai.com/favicon.ico",
			description: "",
			position: 0,
			isFavorite: true,
		},
	],
};

class MemoryStorage {
	constructor() {
		this.values = new Map();
	}

	getItem(key) {
		return this.values.get(key) ?? null;
	}

	setItem(key, value) {
		this.values.set(key, String(value));
	}

	removeItem(key) {
		this.values.delete(key);
	}
}

test("writes and reads a versioned bookmark board cache", () => {
	const storage = new MemoryStorage();
	assert.equal(writeBookmarkBoardCache("user-1", board, storage, 1234), true);

	assert.deepEqual(readBookmarkBoardCache("user-1", storage), {
		version: 1,
		userId: "user-1",
		cachedAt: 1234,
		...board,
	});
});

test("makes cached data available without waiting for a delayed refresh", async () => {
	const storage = new MemoryStorage();
	writeBookmarkBoardCache("user-1", board, storage);
	const refresh = Promise.withResolvers();

	assert.equal(readBookmarkBoardCache("user-1", storage).bookmarks[0].title, "OpenAI");
	refresh.resolve();
	refresh.resolve();
	await refresh.promise;
});

test("replaces a stale cached snapshot with newly confirmed data", () => {
	const storage = new MemoryStorage();
	writeBookmarkBoardCache("user-1", board, storage, 100);
	const freshBoard = {
		...board,
		bookmarks: [{ ...board.bookmarks[0], title: "Fresh OpenAI" }],
	};
	writeBookmarkBoardCache("user-1", freshBoard, storage, 200);

	const cached = readBookmarkBoardCache("user-1", storage);
	assert.equal(cached.cachedAt, 200);
	assert.equal(cached.bookmarks[0].title, "Fresh OpenAI");
});

test("does not expose one user's cache to another user", () => {
	const storage = new MemoryStorage();
	writeBookmarkBoardCache("user-1", board, storage);

	assert.equal(readBookmarkBoardCache("user-2", storage), null);
	assert.equal(
		parseBookmarkBoardCache(storage.getItem(getBookmarkBoardCacheKey("user-1")), "user-2"),
		null,
	);
});

test("rejects malformed, old-version, and invalid-shape cache values", () => {
	assert.equal(parseBookmarkBoardCache("not json", "user-1"), null);
	assert.equal(
		parseBookmarkBoardCache(JSON.stringify({ version: 0, userId: "user-1", ...board }), "user-1"),
		null,
	);
	assert.equal(
		parseBookmarkBoardCache(
			JSON.stringify({ version: 1, userId: "user-1", collections: [{}], bookmarks: [] }),
			"user-1",
		),
		null,
	);
});

test("returns false when a storage quota prevents writes", () => {
	const storage = {
		setItem() {
			throw new Error("quota");
		},
	};
	assert.equal(writeBookmarkBoardCache("user-1", board, storage), false);
});

test("clears only the selected user's cache", () => {
	const storage = new MemoryStorage();
	writeBookmarkBoardCache("user-1", board, storage);
	writeBookmarkBoardCache("user-2", board, storage);

	assert.equal(clearBookmarkBoardCache("user-1", storage), true);
	assert.equal(readBookmarkBoardCache("user-1", storage), null);
	assert.notEqual(readBookmarkBoardCache("user-2", storage), null);
});
