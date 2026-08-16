/** Shared annual planner calculations. Keeping these pure makes the financial rules testable. */
export const PLANNER_MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export const EXPENSE_GROUPS = [
	{ key: "essential", label: "Essentials" },
	{ key: "savings", label: "Savings" },
	{ key: "personal", label: "Personal" },
];

export function emptyMonthlyValues(value = 0) {
	return PLANNER_MONTHS.map(() => Number(value || 0));
}

export function normalizeMonthlyValues(values, fallback = 0) {
	if (!Array.isArray(values)) {
		return emptyMonthlyValues(fallback);
	}
	return PLANNER_MONTHS.map((_, index) => Number(values[index] ?? fallback ?? 0));
}

export function monthIsActive(item, monthIndex) {
	return monthIndex >= Number(item.startMonth ?? 0) && monthIndex <= Number(item.endMonth ?? 11);
}

export function calculateAnnualTotals(data) {
	const income = emptyMonthlyValues();
	const deductions = emptyMonthlyValues();
	const expenses = emptyMonthlyValues();
	const actualExpenses = emptyMonthlyValues();
	const actualIncome = emptyMonthlyValues();
	const actualDeductions = emptyMonthlyValues();
	const installments = emptyMonthlyValues();

	for (const item of data.income || []) {
		const values = normalizeMonthlyValues(item.plan, item.monthly);
		const actual = Array.isArray(item.actual) ? normalizeMonthlyValues(item.actual, 0) : values;
		for (const [month, value] of values.entries()) {
			income[month] += value;
			actualIncome[month] += actual[month];
		}
	}
	for (const item of data.deductions || []) {
		const values = normalizeMonthlyValues(item.plan, item.monthly);
		const actual = Array.isArray(item.actual) ? normalizeMonthlyValues(item.actual, 0) : values;
		for (const [month, value] of values.entries()) {
			deductions[month] += value;
			actualDeductions[month] += actual[month];
		}
	}
	for (const item of data.expenses || []) {
		const plan = normalizeMonthlyValues(item.plan, item.amount);
		const actual = normalizeMonthlyValues(item.actual, 0);
		for (const [month, value] of plan.entries()) {
			expenses[month] += value;
			actualExpenses[month] += actual[month];
		}
	}
	for (const item of data.installments || []) {
		const amount = Number(item.monthly || 0);
		for (let month = 0; month < PLANNER_MONTHS.length; month += 1) {
			if (monthIsActive(item, month)) {
				installments[month] += amount;
			}
		}
	}

	const netPlan = PLANNER_MONTHS.map(
		(_, month) => income[month] - deductions[month] - expenses[month] - installments[month],
	);
	const netActual = PLANNER_MONTHS.map(
		(_, month) =>
			actualIncome[month] - actualDeductions[month] - actualExpenses[month] - installments[month],
	);
	return {
		income,
		deductions,
		expenses,
		actualExpenses,
		actualIncome,
		actualDeductions,
		installments,
		netPlan,
		netActual,
	};
}

export function calculateCardTotals(cards, installments) {
	return cards.map((card) => ({
		...card,
		monthly: PLANNER_MONTHS.map((_, month) =>
			(installments || [])
				.filter((item) => item.cardId === card.id && monthIsActive(item, month))
				.reduce((total, item) => total + Number(item.monthly || 0), 0),
		),
	}));
}

export function toMonthlyRows(items, valueKey, actualKey) {
	return (items || []).flatMap((item) =>
		PLANNER_MONTHS.map((_, index) => ({
			itemId: item.id,
			month: index + 1,
			plannedAmount: Number(item[valueKey]?.[index] ?? item.amount ?? item.monthly ?? 0),
			actualAmount: actualKey ? Number(item[actualKey]?.[index] ?? 0) : 0,
		})),
	);
}
