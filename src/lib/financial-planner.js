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

export function monthsBetween(start, end) {
	const startDate = new Date(`${start}-01T00:00:00Z`);
	const endDate = new Date(`${end}-01T00:00:00Z`);
	if (
		!start ||
		!end ||
		Number.isNaN(startDate.getTime()) ||
		Number.isNaN(endDate.getTime()) ||
		startDate > endDate
	) {
		return [];
	}
	const months = [];
	let date = new Date(startDate);
	while (date <= endDate) {
		months.push({
			year: date.getUTCFullYear(),
			month: date.getUTCMonth(),
			key: date.toISOString().slice(0, 7),
		});
		date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
	}
	return months;
}

export function installmentMonthBounds(item, year) {
	const start = new Date(item.start_month || item.startDate);
	const end = new Date(item.end_month || item.endDate);
	return {
		startMonth: year === start.getUTCFullYear() ? start.getUTCMonth() : 0,
		endMonth: year === end.getUTCFullYear() ? end.getUTCMonth() : 11,
		active: year >= start.getUTCFullYear() && year <= end.getUTCFullYear(),
	};
}

export function installmentIsComplete(item, paidByMonth) {
	return monthsBetween(
		new Date(item.start_month || item.startDate).toISOString().slice(0, 7),
		new Date(item.end_month || item.endDate).toISOString().slice(0, 7),
	).every((entry) => paidByMonth.get(entry.key) === true);
}

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

export function getDashboardMonth(installment, monthIndex) {
	if (!monthIsActive(installment, monthIndex)) {
		return null;
	}
	const amount = Number(installment.monthlyPlan?.[monthIndex] ?? installment.monthly ?? 0);
	return {
		amount,
		paid: Boolean(installment.paidMonths?.[monthIndex]),
	};
}

export function calculateDashboardTotals(cards, installments, monthIndex) {
	return cards.map((card) => {
		const items = (installments || [])
			.filter((item) => item.cardId === card.id && monthIsActive(item, monthIndex))
			.map((item) => ({ ...item, month: getDashboardMonth(item, monthIndex) }));
		return {
			...card,
			items,
			expected: items.reduce((sum, item) => sum + item.month.amount, 0),
			paid: items
				.filter((item) => item.month.paid)
				.reduce((sum, item) => sum + item.month.amount, 0),
		};
	});
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
