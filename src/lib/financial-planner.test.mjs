import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateAnnualTotals,
	calculateCardTotals,
	monthIsActive,
	normalizeMonthlyValues,
} from "./financial-planner.js";

test("normalizes monthly values to twelve numeric months", () => {
	assert.deepEqual(normalizeMonthlyValues([10, 20]), [10, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	assert.equal(normalizeMonthlyValues(null, 5).length, 12);
});

test("calculates annual cash flow from income, deductions, expenses, and installments", () => {
	const totals = calculateAnnualTotals({
		income: [{ monthly: 100, plan: [100, 200] }],
		deductions: [{ monthly: 10 }],
		expenses: [{ amount: 20, plan: [20, 30], actual: [15, 40] }],
		installments: [{ monthly: 25, startMonth: 0, endMonth: 1 }],
	});
	assert.deepEqual(totals.netPlan.slice(0, 3), [45, 135, 70]);
	assert.deepEqual(totals.netActual.slice(0, 2), [50, 125]);
});

test("calculates card totals only for active installment months", () => {
	const [card] = calculateCardTotals(
		[{ id: "card-1", name: "Firstchoice" }],
		[{ cardId: "card-1", monthly: 100, startMonth: 1, endMonth: 2 }],
	);
	assert.deepEqual(card.monthly.slice(0, 4), [0, 100, 100, 0]);
	assert.equal(monthIsActive({ startMonth: 1, endMonth: 2 }, 2), true);
});
