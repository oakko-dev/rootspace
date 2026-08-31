"use client";

import { DayPicker } from "@daypicker/react";
import * as Icons from "lucide-react";
import "@daypicker/react/style.css";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { announceBookmarkBoardUser, writeBookmarkBoardUser } from "@/lib/bookmark-board-user";
import {
	calculateAnnualTotals,
	calculateCardTotals,
	installmentMonthBounds,
	monthsBetween,
	PLANNER_MONTHS,
	normalizeMonthlyValues,
} from "@/lib/financial-planner";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABLES = {
	cards: "financial_planner_cards",
	income: "financial_planner_income",
	deductions: "financial_planner_deductions",
	expenses: "financial_planner_expenses",
	expenseMonths: "financial_planner_expense_months",
	installments: "financial_planner_installments",
	installmentMonths: "financial_planner_installment_months",
};

function createId() {
	return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

/**
 * Formats a numeric planner total with the application's currency symbol.
 * @param {number} value - The numeric amount to format.
 * @returns {string} The formatted currency amount.
 */
function formatMoney(value) {
	return `฿${formatMoneyInput(Number(value || 0))}`;
}

/** Keeps invalid edits visible while focused and commits only valid money values.
 * @param {{ value: string|number, onChange: (value: number) => void, className?: string }} props - Input props.
 * @returns {JSX.Element} The controlled money input.
 */
function MoneyInput(props) {
	const { value, onChange, className } = props;
	const [focused, setFocused] = useState(false);
	const [rawValue, setRawValue] = useState(() => formatMoneyInput(value));

	/**
	 * Commits valid edits while retaining malformed text until blur.
	 * @param {{ target: { value: string } }} event - The input change event.
	 * @returns {void}
	 */
	function handleChange(event) {
		const nextRawValue = event.target.value;
		setRawValue(nextRawValue);
		const parsed = parseMoneyInput(nextRawValue);
		if (parsed !== null) {
			onChange(parsed);
		} else if (!nextRawValue.trim()) {
			onChange(0);
		}
	}

	/** Formats the committed value after editing ends. @returns {void} */
	function handleBlur() {
		const parsed = parseMoneyInput(rawValue);
		const nextValue = parsed ?? Number(value || 0);
		if (parsed !== null) {
			onChange(parsed);
		}
		setRawValue(formatMoneyInput(nextValue));
		setFocused(false);
	}

	return (
		<Input
			type="text"
			inputMode="decimal"
			value={focused ? rawValue : formatMoneyInput(value)}
			onFocus={() => {
				setRawValue(formatMoneyInput(value));
				setFocused(true);
			}}
			onChange={handleChange}
			onBlur={handleBlur}
			className={className}
		/>
	);
}

function MonthYearPicker({ id, label, value, onChange }) {
	const [open, setOpen] = useState(false);
	const selected = value ? new Date(`${value}-01T00:00:00Z`) : undefined;
	return (
		<div className="relative space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<button
				id={id}
				type="button"
				className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-haspopup="dialog"
			>
				{selected?.toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" }) ||
					"Select month"}
				<Icons.Calendar className="size-4 text-muted-foreground" aria-hidden="true" />
			</button>
			{open ? (
				<dialog
					open
					className="absolute z-50 mt-2 rounded-xl border border-border bg-card p-3 shadow-xl"
					aria-label={`${label} picker`}
				>
					<DayPicker
						mode="single"
						selected={selected}
						defaultMonth={selected || new Date()}
						captionLayout="dropdown"
						fromYear={2000}
						toYear={2100}
						onSelect={(date) => {
							if (date) {
								onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
								setOpen(false);
							}
						}}
					/>
				</dialog>
			) : null}
		</div>
	);
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
			if (key !== "cards" && key !== "installments") {
				query = query.eq("planner_year", year);
			}
			return [key, await query];
		}),
	);
	const results = new Map(queries);
	const optionalMonthlyTables = new Set(["expenseMonths", "installmentMonths"]);
	for (const [key, result] of results) {
		if (!optionalMonthlyTables.has(key) && result.error) {
			throw result.error;
		}
		if (
			optionalMonthlyTables.has(key) &&
			result.error &&
			!["PGRST205", "42P01"].includes(result.error.code)
		) {
			throw result.error;
		}
	}
	const rows = (key) => results.get(key)?.data || [];
	const plans = monthlyMap(rows("expenseMonths"), "planned_amount");
	const installmentPlans = monthlyMap(rows("installmentMonths"), "amount", "installment_id");
	return {
		cards: rows("cards"),
		income: rows("income").map((item) => {
			const plan = normalizeMonthlyValues(item.monthly, 0);
			return {
				...item,
				plan,
			};
		}),
		deductions: rows("deductions").map((item) => {
			const plan = normalizeMonthlyValues(item.monthly, 0);
			return {
				...item,
				plan,
			};
		}),
		expenses: rows("expenses").map((item) => ({
			...item,
			plan: PLANNER_MONTHS.map(
				(_, month) => plans.get(item.id)?.[month] ?? Number(item.amount || 0),
			),
		})),
		installments: rows("installments")
			.map((item) => ({
				...item,
				...installmentMonthBounds(item, year),
				cardId: item.card_id,
				monthlyPlan: PLANNER_MONTHS.map(
					(_, month) => installmentPlans.get(item.id)?.[month] ?? Number(item.monthly || 0),
				),
			}))
			.filter((item) => item.active),
	};
}

function AnnualTable({ title, rows, field, onChange, onAdd, onRemove }) {
	const sectionMeta = {
		Income: {
			icon: Icons.TrendingUp,
			tone: "text-emerald-300",
			description: "Money coming in each month",
		},
		Deductions: {
			icon: Icons.ArrowDownToLine,
			tone: "text-amber-300",
			description: "Tax, savings, and automatic deductions",
		},
		"Planned expenses": {
			icon: Icons.ShoppingBag,
			tone: "text-rose-300",
			description: "Recurring costs and spending plans",
		},
	};
	const meta = sectionMeta[title] || sectionMeta.Income;
	const SectionIcon = meta.icon;
	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70 bg-secondary/20">
				<div className="flex items-center gap-3">
					<div
						className={`flex size-10 items-center justify-center rounded-xl bg-background ${meta.tone}`}
					>
						<SectionIcon className="size-5" />
					</div>
					<div>
						<CardTitle>{title}</CardTitle>
						<p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
					</div>
				</div>
				<Button type="button" size="sm" variant="outline" onClick={onAdd}>
					<Icons.Plus className="size-4" /> Add row
				</Button>
			</CardHeader>
			<CardContent className="overflow-x-auto p-0">
				<table className="min-w-[1100px] w-full text-sm">
					<thead className="border-y border-border bg-muted/30 text-left text-xs text-muted-foreground">
						<tr>
							<th className="sticky left-0 z-10 bg-card px-4 py-3 font-semibold">Item</th>
							{PLANNER_MONTHS.map((month) => (
								<th key={month} className="px-2 py-3 text-right font-medium">
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
										className="min-w-40 border-transparent bg-transparent font-medium shadow-none focus:border-input focus:bg-background"
									/>
								</td>
								{PLANNER_MONTHS.map((_, month) => (
									<td key={month} className="px-1 py-2">
										<MoneyInput
											value={item[field]?.[month] ?? 0}
											onChange={(value) => onChange(item.id, field, month, value)}
											className="w-24 border-transparent bg-transparent text-right tabular-nums shadow-none focus:border-input focus:bg-background"
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
	const [addDialog, setAddDialog] = useState({ open: false, group: "income" });
	const [addName, setAddName] = useState("");
	const [installmentDialog, setInstallmentDialog] = useState(false);
	const [savingInstallment, setSavingInstallment] = useState(false);
	const [installmentForm, setInstallmentForm] = useState({
		name: "",
		cardId: "",
		monthly: "0",
		startMonth: "",
		endMonth: "",
		monthlyPlan: {},
	});

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
					writeBookmarkBoardUser(auth.user.id);
					announceBookmarkBoardUser({ id: auth.user.id, email: auth.user.email });
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
				const parsed = parseMoneyInput(maybeValue);
				if (parsed === null) {
					return item;
				}
				values[monthOrValue] = parsed;
				return { ...item, [field]: values };
			}),
		}));
	}

	function addRow(group, nameValue = addName) {
		const name = nameValue.trim();
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
		setAddName("");
		setAddDialog({ open: false, group });
	}

	function openAddDialog(group) {
		setAddName("");
		setAddDialog({ open: true, group });
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
		if (data.cards.length === 0) {
			return;
		}
		setInstallmentForm({
			name: "",
			cardId: data.cards[0].id,
			monthly: "0",
			startMonth: `${year}-01`,
			endMonth: `${year}-12`,
			monthlyPlan: {},
		});
		setInstallmentDialog(true);
	}

	async function saveInstallment(event) {
		event?.preventDefault();
		const name = installmentForm.name.trim();
		const card = data.cards.find((item) => item.id === installmentForm.cardId) || data.cards[0];
		const monthly = parseMoneyInput(installmentForm.monthly);
		const range = monthsBetween(installmentForm.startMonth, installmentForm.endMonth);
		if (!name || !card || monthly === null || !range.length) {
			return;
		}
		const startDate = new Date(`${installmentForm.startMonth}-01T00:00:00Z`);
		const endDate = new Date(`${installmentForm.endMonth}-01T00:00:00Z`);
		const item = {
			id: createId(),
			name,
			cardId: card.id,
			monthly,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			startMonth: startDate.getUTCFullYear() === year ? startDate.getUTCMonth() : 0,
			endMonth: endDate.getUTCFullYear() === year ? endDate.getUTCMonth() : 11,
			monthlyPlan: PLANNER_MONTHS.map((_, monthIndex) => {
				const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
				return parseMoneyInput(installmentForm.monthlyPlan[key] ?? String(monthly)) ?? monthly;
			}),
		};
		if (!user) {
			return;
		}
		setSavingInstallment(true);
		const now = new Date().toISOString();
		const { error: insertError } = await supabase.from(TABLES.installments).insert({
			user_id: user.id,
			id: item.id,
			planner_year: year,
			card_id: item.cardId,
			name: item.name,
			notes: "",
			monthly: item.monthly,
			start_month: startDate.toISOString(),
			end_month: endDate.toISOString(),
			updated_at: now,
		});
		if (insertError) {
			setError(insertError.message);
			setSavingInstallment(false);
			return;
		}
		setData((current) => ({
			...current,
			installments: [...current.installments, item],
		}));
		setInstallmentDialog(false);
		setSavingInstallment(false);
	}

	function updateInstallmentField(field, value) {
		setInstallmentForm((current) => ({ ...current, [field]: value }));
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
					monthly: item.plan || normalizeMonthlyValues(null, 0),
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
					monthly: item.plan || normalizeMonthlyValues(null, 0),
					updated_at: now,
				})),
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
					start_month: item.startDate || new Date(Date.UTC(year, item.startMonth, 1)).toISOString(),
					end_month: item.endDate || new Date(Date.UTC(year, item.endMonth, 1)).toISOString(),
					updated_at: now,
				})),
			);
			await replace(
				TABLES.installmentMonths,
				data.installments.flatMap((item) =>
					PLANNER_MONTHS.map((_, month) => ({
						user_id: user.id,
						installment_id: item.id,
						planner_year: year,
						planner_month: month + 1,
						amount: Number(item.monthlyPlan?.[month] ?? item.monthly ?? 0),
						updated_at: now,
					})),
				),
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
					actual_amount: 0,
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
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-lg shadow-black/10 sm:p-6">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
						<Icons.Sparkles className="size-4" /> Your financial cockpit
					</div>
					<h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
						{year} financial plan
					</h2>
					<p className="mt-2 max-w-xl text-sm text-muted-foreground">
						Plan the year month by month, spot your cash-flow rhythm, and keep every payment in one
						place.
					</p>
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
					<Button type="button" onClick={save} className="min-w-28">
						{saving === "saving" ? <Icons.LoaderCircle className="size-4 animate-spin" /> : null}
						{saving === "saving" ? "Saving..." : saving === "saved" ? "Saved" : "Save plan"}
					</Button>
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
				{[
					["Income", totals.income, "text-emerald-300", Icons.TrendingUp],
					["Deductions", totals.deductions, "text-amber-300", Icons.ArrowDownToLine],
					["Expenses", totals.expenses, "text-rose-300", Icons.ShoppingBag],
					["Card payments", totals.installments, "text-violet-300", Icons.CreditCard],
					["Net cash flow", totals.netPlan, "text-primary", Icons.Activity],
				].map(([label, values, tone, Icon]) => (
					<Card key={label} className="border-border/80 bg-card/80">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<p className="text-xs font-medium text-muted-foreground">{label}</p>
								<Icon className={`size-4 ${tone}`} />
							</div>
							<p
								className={`mt-2 text-xl font-semibold tabular-nums ${label === "Net cash flow" ? tone : ""}`}
							>
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
				onAdd={() => openAddDialog("income")}
				onRemove={(itemId) => removeRow("income", itemId)}
			/>
			<AnnualTable
				title="Deductions"
				rows={data.deductions}
				field="plan"
				onChange={(itemId, field, month, value) =>
					updateRow("deductions", itemId, field, month, value)
				}
				onAdd={() => openAddDialog("deductions")}
				onRemove={(itemId) => removeRow("deductions", itemId)}
			/>
			<AnnualTable
				title="Planned expenses"
				rows={data.expenses}
				field="plan"
				onChange={(itemId, field, month, value) =>
					updateRow("expenses", itemId, field, month, value)
				}
				onAdd={() => openAddDialog("expenses")}
				onRemove={(itemId) => removeRow("expenses", itemId)}
			/>
			<Card className="overflow-hidden">
				<CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70 bg-secondary/20">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-xl bg-background text-violet-300">
							<Icons.CreditCard className="size-5" />
						</div>
						<div>
							<CardTitle>Credit-card payment schedule</CardTitle>
							<p className="mt-1 text-xs text-muted-foreground">
								See planned payments across the year
							</p>
						</div>
					</div>
					<Button type="button" size="sm" variant="outline" onClick={addInstallment}>
						<Icons.Plus className="size-4" /> Add installment
					</Button>
				</CardHeader>
				<CardContent className="space-y-4 overflow-x-auto">
					<table className="min-w-[1100px] w-full text-sm tabular-nums">
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
			<Dialog open={installmentDialog} onOpenChange={setInstallmentDialog}>
				<DialogContent className="max-w-lg overflow-hidden border-border/80 bg-card p-0">
					<DialogHeader className="mb-0 border-b border-border/70 bg-gradient-to-br from-secondary/60 to-card px-6 py-5">
						<div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
							<Icons.CreditCard className="size-5" />
						</div>
						<DialogTitle>Add installment</DialogTitle>
						<p className="max-w-sm text-sm leading-5 text-muted-foreground">
							Add a recurring card payment and define when it appears in your annual plan.
						</p>
					</DialogHeader>
					<form
						className="space-y-5 p-6"
						onSubmit={(event) => {
							event.preventDefault();
							saveInstallment();
						}}
					>
						<div className="space-y-2">
							<Label htmlFor="installment-name">Name</Label>
							<Input
								id="installment-name"
								value={installmentForm.name}
								onChange={(event) => updateInstallmentField("name", event.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="installment-card">Card</Label>
							<select
								id="installment-card"
								value={installmentForm.cardId}
								onChange={(event) => updateInstallmentField("cardId", event.target.value)}
								className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
							>
								{data.cards.map((card) => (
									<option key={card.id} value={card.id}>
										{card.name}
									</option>
								))}
							</select>
						</div>
						<div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-background/40 p-3">
							<div className="space-y-2">
								<MonthYearPicker
									id="installment-start"
									label="Start month"
									value={installmentForm.startMonth}
									onChange={(value) => updateInstallmentField("startMonth", value)}
								/>
							</div>
							<div className="space-y-2">
								<MonthYearPicker
									id="installment-end"
									label="End month"
									value={installmentForm.endMonth}
									onChange={(value) => updateInstallmentField("endMonth", value)}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="installment-monthly">Fixed monthly payment</Label>
							<Input
								id="installment-monthly"
								inputMode="decimal"
								value={installmentForm.monthly}
								onChange={(event) => updateInstallmentField("monthly", event.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								This amount will be used for every month in the selected payment window.
							</p>
						</div>
						<div className="flex justify-end gap-2 border-t border-border/70 pt-4">
							<Button type="button" variant="ghost" onClick={() => setInstallmentDialog(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={savingInstallment}>
								{savingInstallment ? <Icons.LoaderCircle className="size-4 animate-spin" /> : null}
								{savingInstallment ? "Saving..." : "Add installment"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={addDialog.open}
				onOpenChange={(open) => setAddDialog((current) => ({ ...current, open }))}
			>
				<DialogContent className="max-w-md overflow-hidden border-border/80 bg-card p-0">
					<DialogHeader className="mb-0 border-b border-border/70 bg-gradient-to-br from-secondary/60 to-card px-6 py-5">
						<div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
							<Icons.Plus className="size-5" />
						</div>
						<DialogTitle>Add {addDialog.group} item</DialogTitle>
						<p className="text-sm leading-5 text-muted-foreground">
							Give this line item a name, then fill in the monthly plan from the table.
						</p>
					</DialogHeader>
					<form
						className="space-y-5 p-6"
						onSubmit={(event) => {
							event.preventDefault();
							addRow(addDialog.group);
						}}
					>
						<div className="space-y-2">
							<Label htmlFor="planner-add-name">Name</Label>
							<Input
								id="planner-add-name"
								autoFocus
								value={addName}
								onChange={(event) => setAddName(event.target.value)}
								placeholder="e.g. Salary"
								required
							/>
						</div>
						<div className="flex justify-end gap-2 border-t border-border/70 pt-4">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setAddDialog((current) => ({ ...current, open: false }))}
							>
								Cancel
							</Button>
							<Button type="submit">
								<Icons.Plus className="size-4" /> Add item
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
