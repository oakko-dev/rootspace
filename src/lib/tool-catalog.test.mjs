import assert from "node:assert/strict";
import test from "node:test";
import { GUEST_HOME_HREF, toolCatalog } from "./tool-catalog.js";

test("guests land on the first tool that needs no account", () => {
	assert.equal(GUEST_HOME_HREF, "/date-converter");
});

test("live tools expose dedicated sidebar routes with bookmarks as home", () => {
	const liveTools = toolCatalog.filter((tool) => tool.status === "Ready");

	assert.deepEqual(
		liveTools.map((tool) => tool.href),
		[
			"/",
			"/notes",
			"/date-converter",
			"/thai-name-generator",
			"/json-formatter",
			"/id-generator",
			"/encode-decode",
			"/jwt-decoder",
			"/hash-generator",
			"/password-generator",
			"/financial-planner",
		],
	);
	assert.equal(
		toolCatalog.find((tool) => tool.name === "Financial planner").children[0].name,
		"Dashboard",
	);
});
