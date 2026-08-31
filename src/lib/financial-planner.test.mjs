import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateAnnualTotals,
	calculateCardTotals,
	calculateDashboardTotals,
	installmentMonthBounds,
	monthsBetween,
	monthIsActive,
	normalizeMonthlyValues,
} from "./financial-planner.js";

test("normalizes monthly values to twelve numeric months", () => {
	assert.deepEqual(normalizeMonthlyValues([10, 20]), [10, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	assert.equal(normalizeMonthlyValues(null, 5).length, 12);
});

test("builds inclusive month ranges across calendar years", () => {
	assert.deepEqual(
		monthsBetween("2026-08", "2027-02").map((item) => item.key),
		["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"],
	);
	assert.deepEqual(
		installmentMonthBounds({ start_month: "2026-08-01", end_month: "2027-02-01" }, 2027),
		{
			startMonth: 0,
			endMonth: 1,
			active: true,
		},
	);
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

test("calculates dashboard totals from variable monthly amounts and payment status", () => {
	const [card] = calculateDashboardTotals(
		[{ id: "card-1", name: "Firstchoice" }],
		[
			{
				id: "loan-1",
				cardId: "card-1",
				monthly: 100,
				monthlyPlan: [80, 120],
				paidMonths: [true, false],
				startMonth: 0,
				endMonth: 1,
			},
		],
		1,
	);
	assert.equal(card.expected, 120);
	assert.equal(card.paid, 0);
	assert.equal(card.items[0].month.amount, 120);
});
