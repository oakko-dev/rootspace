import assert from "node:assert/strict";
import test from "node:test";
import { toolCatalog } from "./tool-catalog.js";

test("live tools expose dedicated sidebar routes with bookmarks as home", () => {
	const liveTools = toolCatalog.filter((tool) => tool.status === "Ready");

	assert.deepEqual(
		liveTools.map((tool) => tool.href),
		["/", "/date-converter", "/thai-name-generator", "/json-formatter", "/financial-planner"],
	);
});
