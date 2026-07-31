import assert from "node:assert/strict";
import test from "node:test";

import {
  BookmarkBoardError,
  createBookmarkBoardPayload,
  executeBookmarkBoardAction,
  loadBookmarkBoard,
  parseBookmarkBoardAction,
  resolveBookmarkBoardContext,
} from "./bookmark-board-api.js";

const collection = {
  id: "inbox",
  name: "Inbox",
  description: "Links",
  color: "#7dd3fc",
  position: 0,
};

const bookmark = {
  id: "openai",
  collectionId: "inbox",
  title: "OpenAI",
  url: "https://openai.com/",
  faviconUrl: "",
  description: "AI",
  position: 0,
  isFavorite: false,
};

function createFakeSupabase({ collections = [], bookmarks = [], errors = {} } = {}) {
  const calls = [];
  const dataByTable = {
    rootspace_bookmark_collections: collections,
    rootspace_bookmarks: bookmarks,
  };

  return {
    calls,
    from(table) {
      let operation = "";
      const filters = [];
      const builder = {
        select(columns) {
          operation = "select";
          calls.push({ operation: "select-start", table, columns });
          return builder;
        },
        upsert(rows) {
          calls.push({ operation: "upsert", table, rows });
          return Promise.resolve({ error: errors[table] || null });
        },
        delete() {
          operation = "delete";
          return builder;
        },
        eq(column, value) {
          filters.push([column, value]);
          return builder;
        },
        order(column, options) {
          calls.push({ operation: "select", table, column, options, filters });
          return Promise.resolve({ data: dataByTable[table], error: errors[table] || null });
        },
        then(resolve, reject) {
          if (operation !== "delete") return Promise.resolve({ error: null }).then(resolve, reject);
          calls.push({ operation: "delete", table, filters });
          return Promise.resolve({ error: errors[table] || null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

test("validates discriminated bookmark board actions", () => {
  assert.equal(
    parseBookmarkBoardAction({ action: "upsert-bookmarks", bookmarks: [bookmark] }).action,
    "upsert-bookmarks",
  );
  assert.throws(
    () => parseBookmarkBoardAction({ action: "unknown" }),
    (error) => error instanceof BookmarkBoardError && error.status === 400,
  );
});

test("rejects unauthenticated board requests before creating a database client", async () => {
  let clientCreated = false;
  await assert.rejects(
    () =>
      resolveBookmarkBoardContext(
        async () => null,
        async () => {
          clientCreated = true;
          return {};
        },
      ),
    (error) => error instanceof BookmarkBoardError && error.status === 401,
  );
  assert.equal(clientCreated, false);
});

test("binds authenticated board requests to the resolved server user", async () => {
  const user = { id: "user-1", email: "user@example.com" };
  const supabase = { name: "server-client" };
  const context = await resolveBookmarkBoardContext(
    async () => user,
    async () => supabase,
  );

  assert.equal(context.user, user);
  assert.equal(context.supabase, supabase);
});

test("returns verified user details with a bookmark board", () => {
  const payload = createBookmarkBoardPayload(
    { version: 1, userId: "user-1", collections: [collection], bookmarks: [bookmark] },
    { id: "user-1", email: "user@example.com" },
  );

  assert.deepEqual(payload.user, { id: "user-1", email: "user@example.com" });
  assert.equal(payload.userId, "user-1");
  assert.equal(payload.bookmarks[0].id, "openai");
});

test("loads collections and bookmarks in parallel-shaped queries", async () => {
  const supabase = createFakeSupabase({
    collections: [
      { id: "inbox", name: "Inbox", description: "", color: "#7dd3fc", position: 0 },
    ],
    bookmarks: [
      {
        id: "openai",
        collection_id: "inbox",
        title: "OpenAI",
        url: "https://openai.com/",
        favicon_url: "",
        description: "",
        position: 0,
        is_favorite: true,
      },
    ],
  });

  const result = await loadBookmarkBoard(supabase, "user-1");
  assert.equal(supabase.calls.filter((call) => call.operation === "select-start").length, 2);
  assert.equal(result.collections[0].id, "inbox");
  assert.equal(result.bookmarks[0].collectionId, "inbox");
  assert.equal(result.bookmarks[0].isFavorite, true);
  assert.match(result.bookmarks[0].faviconUrl, /favicon\.ico$/);
  assert.equal(result.missingFaviconBookmarks.length, 1);
});

test("creates a default Inbox when the user has no collections", async () => {
  const supabase = createFakeSupabase();
  const result = await loadBookmarkBoard(supabase, "user-1", () => "generated-inbox");

  assert.equal(result.collections[0].id, "generated-inbox");
  const insert = supabase.calls.find((call) => call.operation === "upsert");
  assert.equal(insert.rows[0].user_id, "user-1");
});

test("server mutations derive user_id instead of trusting payload fields", async () => {
  const supabase = createFakeSupabase();
  await executeBookmarkBoardAction(supabase, "trusted-user", {
    action: "upsert-collections",
    collections: [{ ...collection, user_id: "attacker" }],
  });

  const upsert = supabase.calls.find((call) => call.operation === "upsert");
  assert.equal(upsert.rows[0].user_id, "trusted-user");
  assert.equal("attacker" in upsert.rows[0], false);
});

test("delete collection removes it and persists remaining positions", async () => {
  const supabase = createFakeSupabase();
  await executeBookmarkBoardAction(supabase, "user-1", {
    action: "delete-collection",
    collectionId: "old",
    collections: [collection],
  });

  assert.deepEqual(
    supabase.calls.find((call) => call.operation === "delete").filters,
    [["user_id", "user-1"], ["id", "old"]],
  );
  assert.equal(supabase.calls.some((call) => call.operation === "upsert"), true);
});

test("maps missing-table failures to an actionable service error", async () => {
  const supabase = createFakeSupabase({
    errors: { rootspace_bookmark_collections: { code: "42P01", message: "relation missing" } },
  });

  await assert.rejects(
    () => loadBookmarkBoard(supabase, "user-1"),
    (error) => error instanceof BookmarkBoardError && error.status === 503,
  );
});
