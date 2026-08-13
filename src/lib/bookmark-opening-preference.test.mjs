// Tests the public browser-storage contract for bookmark navigation preferences.
import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOKMARK_OPENING_CURRENT_TAB,
  BOOKMARK_OPENING_NEW_TAB,
  getBookmarkLinkTarget,
  parseBookmarkOpeningPreference,
  readBookmarkOpeningPreference,
  writeBookmarkOpeningPreference,
} from "./bookmark-opening-preference.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

test("defaults to a new tab and persists a current-tab preference", () => {
  const storage = new MemoryStorage();

  assert.equal(readBookmarkOpeningPreference(storage), BOOKMARK_OPENING_NEW_TAB);
  assert.equal(writeBookmarkOpeningPreference(BOOKMARK_OPENING_CURRENT_TAB, storage), true);
  assert.equal(readBookmarkOpeningPreference(storage), BOOKMARK_OPENING_CURRENT_TAB);
});

test("falls back to a new tab when saved preference data is malformed", () => {
  assert.equal(parseBookmarkOpeningPreference("not json"), BOOKMARK_OPENING_NEW_TAB);
  assert.equal(
    parseBookmarkOpeningPreference(JSON.stringify({ version: 2, preference: "current-tab" })),
    BOOKMARK_OPENING_NEW_TAB,
  );
  assert.equal(
    parseBookmarkOpeningPreference(JSON.stringify({ version: 1, preference: "popup" })),
    BOOKMARK_OPENING_NEW_TAB,
  );
});

test("falls back safely when browser storage is unavailable", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
  };

  assert.equal(readBookmarkOpeningPreference(storage), BOOKMARK_OPENING_NEW_TAB);
  assert.equal(writeBookmarkOpeningPreference(BOOKMARK_OPENING_CURRENT_TAB, storage), false);
  assert.equal(writeBookmarkOpeningPreference("popup", new MemoryStorage()), false);
});

test("maps ordinary bookmark clicks to the selected browser target", () => {
  assert.equal(getBookmarkLinkTarget(BOOKMARK_OPENING_NEW_TAB), "_blank");
  assert.equal(getBookmarkLinkTarget(BOOKMARK_OPENING_CURRENT_TAB), undefined);
});
