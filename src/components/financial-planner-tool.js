"use client";

import * as Icons from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	calculateAnnualTotals,
	calculateCardTotals,
	PLANNER_MONTHS,
	normalizeMonthlyValues,
} from "@/lib/financial-planner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABLES = {
	cards: "financial_planner_cards",
	income: "financial_planner_income",
	deductions: "financial_planner_deductions",
	expenses: "financial_planner_expenses",
	expenseMonths: "financial_planner_expense_months",
	installments: "financial_planner_installments",
	incomeActuals: "financial_planner_income_actuals",
	deductionActuals: "financial_planner_deduction_actuals",
};

function createId() {
	return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function formatMoney(value) {
	return `฿${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function emptyYear() {
	return { cards: [], income: [], deductions: [], expenses: [], installments: [] };
}

function monthlyMap(rows, field, idField = "item_id") {
	const values = new Map();
	for (const row of rows || []) {
		const item = values.get(row[idField]) || {};
		item[row.planner_month - 1] = Number(row[field] || 0);
		values.set(row[idField], item);
	}
	return values;
}

async function loadYear(supabase, userId, year) {
	const queries = await Promise.all(
		Object.entries(TABLES).map(async ([key, table]) => {
			let query = supabase.from(table).select("*").eq("user_id", userId);
			if (key !== "cards") {
				query = query.eq("planner_year", year);
			}
			return [key, await query];
		}),
	);
	const results = new Map(queries);
	const monthlyResult = results.get("expenseMonths");
	if (monthlyResult.error && !["PGRST205", "42P01"].includes(monthlyResult.error.code)) {
		throw monthlyResult.error;
	}
	for (const [key, result] of results) {
		if (key !== "expenseMonths" && result.error) {
			throw result.error;
		}
	}
	const rows = (key) => results.get(key)?.data || [];
	const plans = monthlyMap(rows("expenseMonths"), "planned_amount");
	const actuals = monthlyMap(rows("expenseMonths"), "actual_amount");
	const incomeActuals = monthlyMap(rows("incomeActuals"), "amount", "income_id");
	const deductionActuals = monthlyMap(rows("deductionActuals"), "amount", "deduction_id");
	return {
		cards: rows("cards"),
		income: rows("income").map((item) => {
			const plan = normalizeMonthlyValues(null, item.monthly);
			return {
				...item,
				plan,
				actual: PLANNER_MONTHS.map(
					(_, month) => incomeActuals.get(item.id)?.[month] ?? plan[month],
				),
			};
		}),
		deductions: rows("deductions").map((item) => {
			const plan = normalizeMonthlyValues(null, item.monthly);
			return {
				...item,
				plan,
				actual: PLANNER_MONTHS.map(
					(_, month) => deductionActuals.get(item.id)?.[month] ?? plan[month],
				),
			};
		}),
		expenses: rows("expenses").map((item) => ({
			...item,
			plan: PLANNER_MONTHS.map(
				(_, month) => plans.get(item.id)?.[month] ?? Number(item.amount || 0),
			),
			actual: PLANNER_MONTHS.map((_, month) => actuals.get(item.id)?.[month] ?? 0),
		})),
		installments: rows("installments").map((item) => ({
			...item,
			cardId: item.card_id,
			startMonth: new Date(item.start_month).getUTCMonth(),
			endMonth: new Date(item.end_month).getUTCMonth(),
		})),
	};
}

function AnnualTable({ title, rows, field, onChange, onAdd, onRemove }) {
	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between gap-3">
				<CardTitle>{title}</CardTitle>
				<Button type="button" size="sm" variant="outline" onClick={onAdd}>
					<Icons.Plus className="size-4" /> Add row
				</Button>
			</CardHeader>
			<CardContent className="overflow-x-auto p-0">
				<table className="min-w-[1100px] w-full text-sm">
					<thead className="border-y border-border bg-muted/30 text-left text-xs text-muted-foreground">
						<tr>
							<th className="sticky left-0 z-10 bg-card px-4 py-3">Item</th>
							{PLANNER_MONTHS.map((month) => (
								<th key={month} className="px-2 py-3 text-right">
									{month}
								</th>
							))}
							<th className="px-4 py-3 text-right">Year</th>
							<th aria-label="Actions" />
						</tr>
					</thead>
					<tbody>
						{rows.map((item) => (
							<tr key={item.id} className="border-b border-border/70 last:border-0">
								<td className="sticky left-0 z-10 bg-card px-4 py-2">
									<Input
										value={item.name}
										onChange={(event) => onChange(item.id, "name", event.target.value)}
										className="min-w-40"
									/>
								</td>
								{PLANNER_MONTHS.map((_, month) => (
									<td key={month} className="px-1 py-2">
										<Input
											type="number"
											step="0.01"
											value={item[field]?.[month] ?? 0}
											onChange={(event) => onChange(item.id, field, month, event.target.value)}
											className="w-24 text-right"
										/>
									</td>
								))}
								<td className="px-4 py-2 text-right font-medium">
									{formatMoney(
										(item[field] || []).reduce((sum, value) => sum + Number(value || 0), 0),
									)}
								</td>
								<td className="px-2">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => onRemove(item.id)}
										aria-label={`Delete ${item.name}`}
									>
										<Icons.Trash2 className="size-4" />
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</CardContent>
		</Card>
	);
}

export default function FinancialPlannerTool() {
	const [supabase, setSupabase] = useState(() => createSupabaseBrowserClient());
	void setSupabase;
	const [user, setUser] = useState(null);
	const [year, setYear] = useState(new Date().getFullYear());
	const [data, setData] = useState(emptyYear);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState("");

	useEffect(() => {
		let active = true;
		async function load() {
			try {
				setLoading(true);
				const { data: auth, error: authError } = await supabase.auth.getUser();
				if (authError || !auth.user) {
					throw new Error("You must be logged in to view your financial planner.");
				}
				const next = await loadYear(supabase, auth.user.id, year);
				if (active) {
					setUser(auth.user);
					setData(next);
				}
			} catch (loadError) {
				if (active) {
					setError(loadError instanceof Error ? loadError.message : "Unable to load planner.");
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		}
		load();
		return () => {
			active = false;
		};
	}, [supabase, year]);

	const totals = useMemo(() => calculateAnnualTotals(data), [data]);
	const cardTotals = useMemo(
		() => calculateCardTotals(data.cards, data.installments),
		[data.cards, data.installments],
	);
	const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index);

	function updateRow(group, itemId, field, monthOrValue, maybeValue) {
		setData((current) => ({
			...current,
			[group]: current[group].map((item) => {
				if (item.id !== itemId) {
					return item;
				}
				if (field === "name") {
					return { ...item, name: monthOrValue };
				}
				const values = [
					...(item[field] || normalizeMonthlyValues(null, item.monthly || item.amount)),
				];
				values[monthOrValue] = Math.max(0, Number(maybeValue || 0));
				return { ...item, [field]: values };
			}),
		}));
	}

	function addRow(group) {
		const name = Reflect.get(globalThis, "prompt")(`Name for new ${group} item:`)?.trim();
		if (!name) {
			return;
		}
		const row = {
			id: createId(),
			name,
			notes: "",
			plan: normalizeMonthlyValues(null, 0),
			actual: normalizeMonthlyValues(null, 0),
		};
		setData((current) => ({ ...current, [group]: [...current[group], row] }));
	}

	function removeRow(group, itemId) {
		if (Reflect.get(globalThis, "confirm")("Remove this planner row?")) {
			setData((current) => ({
				...current,
				[group]: current[group].filter((item) => item.id !== itemId),
			}));
		}
	}

	function addInstallment() {
		const name = Reflect.get(globalThis, "prompt")("Installment item name:")?.trim();
		if (!name || data.cards.length === 0) {
			return;
		}
		const cardName = Reflect.get(
			globalThis,
			"prompt",
		)(`Card name (${data.cards.map((card) => card.name).join(", ")}):`)?.trim();
		const card = data.cards.find((item) => item.name === cardName) || data.cards[0];
		const monthly = Number(Reflect.get(globalThis, "prompt")("Monthly payment:", "0") || 0);
		const startMonth = Math.max(
			0,
			Math.min(11, Number(Reflect.get(globalThis, "prompt")("Start month (1-12):", "1") || 1) - 1),
		);
		const endMonth = Math.max(
			startMonth,
			Math.min(11, Number(Reflect.get(globalThis, "prompt")("End month (1-12):", "12") || 12) - 1),
		);
		setData((current) => ({
			...current,
			installments: [
				...current.installments,
				{ id: createId(), name, cardId: card.id, monthly, startMonth, endMonth },
			],
		}));
	}

	function removeInstallment(itemId) {
		if (Reflect.get(globalThis, "confirm")("Remove this installment?")) {
			setData((current) => ({
				...current,
				installments: current.installments.filter((item) => item.id !== itemId),
			}));
		}
	}

	async function save() {
		if (!user) {
			return;
		}
		setSaving("saving");
		try {
			const now = new Date().toISOString();
			const replace = async (table, values) => {
				const deleted = await supabase
					.from(table)
					.delete()
					.eq("user_id", user.id)
					.eq("planner_year", year);
				if (deleted.error) {
					throw deleted.error;
				}
				if (values.length) {
					const inserted = await supabase.from(table).insert(values);
					if (inserted.error) {
						throw inserted.error;
					}
				}
			};
			await replace(
				TABLES.income,
				data.income.map((item) => ({
					user_id: user.id,
					id: item.id,
					planner_year: year,
					name: item.name,
					notes: item.notes || "",
					monthly: Number(item.plan?.[0] || 0),
					updated_at: now,
				})),
			);
			await replace(
				TABLES.deductions,
				data.deductions.map((item) => ({
					user_id: user.id,
					id: item.id,
					planner_year: year,
					name: item.name,
					notes: item.notes || "",
					monthly: Number(item.plan?.[0] || 0),
					updated_at: now,
				})),
			);
			await replace(
				TABLES.incomeActuals,
				data.income.flatMap((item) =>
					PLANNER_MONTHS.map((_, month) => ({
						user_id: user.id,
						income_id: item.id,
						planner_year: year,
						planner_month: month + 1,
						amount: Number(item.actual?.[month] || 0),
						updated_at: now,
					})),
				),
			);
			await replace(
				TABLES.deductionActuals,
				data.deductions.flatMap((item) =>
					PLANNER_MONTHS.map((_, month) => ({
						user_id: user.id,
						deduction_id: item.id,
						planner_year: year,
						planner_month: month + 1,
						amount: Number(item.actual?.[month] || 0),
						updated_at: now,
					})),
				),
			);
			await replace(
				TABLES.installments,
				data.installments.map((item) => ({
					user_id: user.id,
					id: item.id,
					planner_year: year,
					card_id: item.cardId,
					name: item.name,
					notes: item.notes || "",
					monthly: Number(item.monthly || 0),
					start_month: new Date(Date.UTC(year, item.startMonth, 1)).toISOString(),
					end_month: new Date(Date.UTC(year, item.endMonth, 1)).toISOString(),
					updated_at: now,
				})),
			);
			await replace(
				TABLES.expenses,
				data.expenses.map((item) => ({
					user_id: user.id,
					id: item.id,
					planner_year: year,
					name: item.name,
					notes: item.notes || "",
					amount: Number(item.plan?.[0] || 0),
					expense_type: item.expense_type || "essential",
					icon: item.icon || "HelpCircle",
					updated_at: now,
				})),
			);
			const months = data.expenses.flatMap((item) =>
				PLANNER_MONTHS.map((_, month) => ({
					user_id: user.id,
					item_id: item.id,
					planner_year: year,
					planner_month: month + 1,
					planned_amount: Number(item.plan?.[month] || 0),
					actual_amount: Number(item.actual?.[month] || 0),
					updated_at: now,
				})),
			);
			await replace(TABLES.expenseMonths, months);
			setSaving("saved");
			setTimeout(() => setSaving(""), 2000);
		} catch (saveError) {
			setSaving("error");
			setError(saveError instanceof Error ? saveError.message : "Unable to save planner.");
		}
	}

	if (loading) {
		return <Card className="p-5 text-sm text-muted-foreground">Loading planner...</Card>;
	}
	if (error) {
		return <Alert variant="destructive">{error}</Alert>;
	}
	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-sm text-muted-foreground">Annual budget and debt planner</p>
					<h2 className="text-2xl font-semibold">{year} financial plan</h2>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={year}
						onChange={(event) => setYear(Number(event.target.value))}
						className="h-10 rounded-md border border-input bg-background px-3 text-sm"
					>
						{years.map((option) => (
							<option key={option}>{option}</option>
						))}
					</select>
					<Button type="button" onClick={save}>
						{saving || "Save plan"}
					</Button>
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				{[
					["Income", totals.income],
					["Deductions", totals.deductions],
					["Expenses", totals.expenses],
					["Card payments", totals.installments],
					["Net cash flow", totals.netPlan],
				].map(([label, values]) => (
					<Card key={label}>
						<CardContent className="p-4">
							<p className="text-xs text-muted-foreground">{label}</p>
							<p className="mt-2 text-xl font-semibold">
								{formatMoney(values.reduce((sum, value) => sum + value, 0))}
							</p>
						</CardContent>
					</Card>
				))}
			</div>
			<AnnualTable
				title="Income"
				rows={data.income}
				field="plan"
				onChange={(itemId, field, month, value) => updateRow("income", itemId, field, month, value)}
				onAdd={() => addRow("income")}
				onRemove={(itemId) => removeRow("income", itemId)}
			/>
			<AnnualTable
				title="Actual income"
				rows={data.income}
				field="actual"
				onChange={(itemId, field, month, value) => updateRow("income", itemId, field, month, value)}
				onAdd={() => addRow("income")}
				onRemove={(itemId) => removeRow("income", itemId)}
			/>
			<AnnualTable
				title="Deductions"
				rows={data.deductions}
				field="plan"
				onChange={(itemId, field, month, value) =>
					updateRow("deductions", itemId, field, month, value)
				}
				onAdd={() => addRow("deductions")}
				onRemove={(itemId) => removeRow("deductions", itemId)}
			/>
			<AnnualTable
				title="Actual deductions"
				rows={data.deductions}
				field="actual"
				onChange={(itemId, field, month, value) =>
					updateRow("deductions", itemId, field, month, value)
				}
				onAdd={() => addRow("deductions")}
				onRemove={(itemId) => removeRow("deductions", itemId)}
			/>
			<AnnualTable
				title="Planned expenses"
				rows={data.expenses}
				field="plan"
				onChange={(itemId, field, month, value) =>
					updateRow("expenses", itemId, field, month, value)
				}
				onAdd={() => addRow("expenses")}
				onRemove={(itemId) => removeRow("expenses", itemId)}
			/>
			<AnnualTable
				title="Actual expenses"
				rows={data.expenses}
				field="actual"
				onChange={(itemId, field, month, value) =>
					updateRow("expenses", itemId, field, month, value)
				}
				onAdd={() => addRow("expenses")}
				onRemove={(itemId) => removeRow("expenses", itemId)}
			/>
			<Card>
				<CardHeader className="flex-row items-center justify-between gap-3">
					<CardTitle>Credit-card payment schedule</CardTitle>
					<Button type="button" size="sm" variant="outline" onClick={addInstallment}>
						<Icons.Plus className="size-4" /> Add installment
					</Button>
				</CardHeader>
				<CardContent className="space-y-4 overflow-x-auto">
					<table className="min-w-[1100px] w-full text-sm">
						<thead>
							<tr className="border-b border-border text-left text-xs text-muted-foreground">
								<th className="px-2 py-2">Card</th>
								{PLANNER_MONTHS.map((month) => (
									<th key={month} className="px-2 py-2 text-right">
										{month}
									</th>
								))}
								<th className="px-2 py-2 text-right">Year</th>
							</tr>
						</thead>
						<tbody>
							{cardTotals.map((card) => (
								<tr key={card.id} className="border-b border-border font-semibold">
									<td className="px-2 py-2">{card.name}</td>
									{card.monthly.map((value, month) => (
										<td key={month} className="px-2 py-2 text-right">
											{formatMoney(value)}
										</td>
									))}
									<td className="px-2 py-2 text-right">
										{formatMoney(card.monthly.reduce((sum, value) => sum + value, 0))}
									</td>
								</tr>
							))}
							<tr className="font-bold">
								<td className="px-2 py-2">All cards</td>
								{totals.installments.map((value, month) => (
									<td key={month} className="px-2 py-2 text-right">
										{formatMoney(value)}
									</td>
								))}
								<td className="px-2 py-2 text-right">
									{formatMoney(totals.installments.reduce((sum, value) => sum + value, 0))}
								</td>
							</tr>
						</tbody>
					</table>
					{data.installments.length ? (
						<div className="grid gap-3 md:grid-cols-2">
							{data.installments.map((item) => (
								<div key={item.id} className="rounded-lg border border-border p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-semibold">{item.name}</p>
											<p className="text-sm text-muted-foreground">
												{data.cards.find((card) => card.id === item.cardId)?.name ||
													"Unassigned card"}
											</p>
										</div>
										<Badge variant="secondary">{formatMoney(item.monthly)} / month</Badge>
									</div>
									<p className="mt-3 text-xs text-muted-foreground">
										Payment window: {PLANNER_MONTHS[item.startMonth]} -{" "}
										{PLANNER_MONTHS[item.endMonth]}
									</p>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="mt-2"
										onClick={() => removeInstallment(item.id)}
									>
										Remove
									</Button>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">No installment items configured yet.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
