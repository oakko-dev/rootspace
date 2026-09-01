import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../../script.sql", import.meta.url), "utf-8");

function tableDefinition(tableName) {
	const match = schema.match(
		new RegExp(`create table public\\.${tableName} \\(([\\s\\S]*?)\\n\\);`, "u"),
	);
	assert.ok(match, `Expected ${tableName} table definition`);
	return match[1];
}

test("scopes planner income identity and actuals by planner year", () => {
	const income = tableDefinition("financial_planner_income");
	const incomeActuals = tableDefinition("financial_planner_income_actuals");

	assert.match(income, /primary key \(user_id, id, planner_year\)/u);
	assert.match(
		incomeActuals,
		/foreign key \(user_id, income_id, planner_year\)\s+references public\.financial_planner_income \(user_id, id, planner_year\)/u,
	);
});
