import assert from "node:assert/strict";
import test from "node:test";
import {
	createBookmarkTitleFallback,
	exportBookmarkBoard,
	extractHtmlFaviconUrl,
	extractHtmlTitle,
	filterBookmarkBoard,
	getBookmarkFaviconUrl,
	normalizeBookmarkUrl,
	parseBookmarkBoardExport,
	parseBookmarkLines,
	sortBookmarks,
	sortCollections,
} from "./bookmark-start-page.js";

test("normalizes URLs and creates host title fallbacks", () => {
	assert.equal(normalizeBookmarkUrl("example.com/path"), "https://example.com/path");
	assert.equal(normalizeBookmarkUrl("http://example.com"), "http://example.com/");
	assert.equal(createBookmarkTitleFallback("https://www.example.com/docs"), "example.com");
	assert.equal(
		getBookmarkFaviconUrl("https://www.example.com/docs"),
		"https://www.example.com/favicon.ico",
	);
});

test("extracts and decodes an HTML title", () => {
	assert.equal(
		extractHtmlTitle("<html><head><title>Docs &amp; API &#35;1</title></head></html>"),
		"Docs & API #1",
	);
	assert.equal(extractHtmlTitle("<html><body>No title</body></html>"), "");
});

test("extracts and resolves a declared favicon URL", () => {
	assert.equal(
		extractHtmlFaviconUrl(
			'<html><head><link rel="icon" href="/assets/favicon.png"></head></html>',
			"https://example.com/docs/page",
		),
		"https://example.com/assets/favicon.png",
	);
	assert.equal(
		extractHtmlFaviconUrl("<html><head></head></html>", "https://example.com/docs"),
		"https://example.com/favicon.ico",
	);
});

test("rejects invalid or unsupported URLs", () => {
	assert.throws(() => normalizeBookmarkUrl("ftp://example.com"), /Only http and https/u);
	assert.throws(() => normalizeBookmarkUrl("not a url"), /valid URL/u);
});

test("imports non-empty pasted URL lines", () => {
	assert.deepEqual(parseBookmarkLines("\nopenai.com\n https://example.com/docs \n"), [
		{
			title: "openai.com",
			url: "https://openai.com/",
			faviconUrl: "https://openai.com/favicon.ico",
			description: "",
			position: 0,
			isFavorite: false,
		},
		{
			title: "example.com",
			url: "https://example.com/docs",
			faviconUrl: "https://example.com/favicon.ico",
			description: "",
			position: 1,
			isFavorite: false,
		},
	]);
});

test("sorts collections by position and bookmarks with favorites first", () => {
	assert.deepEqual(
		sortCollections([
			{ id: "later", name: "Later", position: 2 },
			{ id: "inbox", name: "Inbox", position: 0 },
		]).map((collection) => collection.id),
		["inbox", "later"],
	);

	assert.deepEqual(
		sortBookmarks([
			{ id: "a", title: "A", position: 0, isFavorite: false },
			{ id: "b", title: "B", position: 5, isFavorite: true },
			{ id: "c", title: "C", position: 1, isFavorite: false },
		]).map((bookmark) => bookmark.id),
		["b", "a", "c"],
	);
});

test("filters board by collection and bookmark text", () => {
	const collections = [
		{ id: "work", name: "Work", description: "Client docs", position: 0 },
		{ id: "read", name: "Reading", description: "", position: 1 },
	];
	const bookmarks = [
		{
			id: "crm",
			collectionId: "work",
			title: "CRM",
			url: "https://crm.example.com",
			description: "",
		},
		{
			id: "paper",
			collectionId: "read",
			title: "Paper",
			url: "https://papers.example.com",
			description: "AI notes",
		},
	];

	assert.deepEqual(
		filterBookmarkBoard(collections, bookmarks, "client").map((collection) => collection.id),
		["work"],
	);
	assert.deepEqual(
		filterBookmarkBoard(collections, bookmarks, "ai").map((collection) =>
			collection.bookmarks.map((bookmark) => bookmark.id),
		),
		[["paper"]],
	);
});

test("exports and parses board JSON shape", () => {
	const collections = [
		{ id: "inbox", name: "Inbox", description: "", color: "#7dd3fc", position: 0 },
	];
	const bookmarks = [
		{
			id: "openai",
			collectionId: "inbox",
			title: "OpenAI",
			url: "openai.com",
			faviconUrl: "https://openai.com/icon.png",
			description: "Docs",
			position: 0,
			isFavorite: true,
		},
	];

	const parsed = parseBookmarkBoardExport(exportBookmarkBoard(collections, bookmarks));

	assert.equal(parsed.collections[0].name, "Inbox");
	assert.equal(parsed.bookmarks[0].url, "https://openai.com/");
	assert.equal(parsed.bookmarks[0].faviconUrl, "https://openai.com/icon.png");
	assert.equal(parsed.bookmarks[0].isFavorite, true);
});
