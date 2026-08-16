import assert from "node:assert/strict";
import test from "node:test";
import {
	BOOKMARK_BOARD_USER_KEY,
	clearBookmarkBoardUser,
	parseBookmarkBoardUser,
	readBookmarkBoardUser,
	writeBookmarkBoardUser,
} from "./bookmark-board-user.js";

class MemoryStorage {
	values = new Map();

	getItem(key) {
		return this.values.get(key) ?? null;
	}

	setItem(key, value) {
		this.values.set(key, value);
	}

	removeItem(key) {
		this.values.delete(key);
	}
}

test("persists and reads the active bookmark user", () => {
	const storage = new MemoryStorage();
	assert.equal(writeBookmarkBoardUser("user-1", storage), true);
	assert.deepEqual(readBookmarkBoardUser(storage), { version: 1, userId: "user-1" });
});

test("rejects malformed, unsupported, and empty active-user payloads", () => {
	assert.equal(parseBookmarkBoardUser("not json"), null);
	assert.equal(parseBookmarkBoardUser(JSON.stringify({ version: 2, userId: "user-1" })), null);
	assert.equal(parseBookmarkBoardUser(JSON.stringify({ version: 1, userId: "" })), null);
	assert.equal(parseBookmarkBoardUser(JSON.stringify({ version: 1, userId: 123 })), null);
});

test("returns false when storage access fails", () => {
	const storage = {
		getItem() {
			throw new Error("blocked");
		},
		setItem() {
			throw new Error("full");
		},
		removeItem() {
			throw new Error("blocked");
		},
	};

	assert.equal(readBookmarkBoardUser(storage), null);
	assert.equal(writeBookmarkBoardUser("user-1", storage), false);
	assert.equal(clearBookmarkBoardUser(storage), false);
});

test("clears the active bookmark user on sign-out", () => {
	const storage = new MemoryStorage();
	writeBookmarkBoardUser("user-1", storage);
	assert.equal(clearBookmarkBoardUser(storage), true);
	assert.equal(storage.getItem(BOOKMARK_BOARD_USER_KEY), null);
});
