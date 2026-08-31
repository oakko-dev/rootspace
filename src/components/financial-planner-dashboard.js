"use client";

import { Check, ChevronLeft, ChevronRight, Circle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	calculateDashboardTotals,
	installmentMonthBounds,
	PLANNER_MONTHS,
} from "@/lib/financial-planner";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MONTH_TABLE = "financial_planner_installment_months";
const YEAR_TABLE = "financial_planner_installments";
const CARD_TABLE = "financial_planner_cards";

function amount(value) {
	return `฿${formatMoneyInput(value)}`;
}

export default function FinancialPlannerDashboard() {
	const [supabase, setSupabase] = useState(() => createSupabaseBrowserClient());
	void setSupabase;
	const [user, setUser] = useState(null);
	const [month, setMonth] = useState(new Date().getMonth());
	const [year, setYear] = useState(new Date().getFullYear());
	const [cards, setCards] = useState([]);
	const [installments, setInstallments] = useState([]);
	const [showCompleted, setShowCompleted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(null);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		async function load() {
			try {
				const auth = await supabase.auth.getUser();
				if (auth.error || !auth.data.user) {
					throw new Error("You must be logged in to view the dashboard.");
				}
				const [cardResult, installmentResult, monthResult] = await Promise.all([
					supabase.from(CARD_TABLE).select("*").eq("user_id", auth.data.user.id).order("name"),
					supabase.from(YEAR_TABLE).select("*").eq("user_id", auth.data.user.id),
					supabase
						.from(MONTH_TABLE)
						.select("*")
						.eq("user_id", auth.data.user.id)
						.eq("planner_year", year),
				]);
				if (cardResult.error) {
					throw cardResult.error;
				}
				if (installmentResult.error) {
					throw installmentResult.error;
				}
				if (monthResult.error && !["PGRST205", "42P01"].includes(monthResult.error.code)) {
					throw monthResult.error;
				}
				const monthly = new Map(
					(monthResult.data || []).map((row) => [
						`${row.installment_id}:${row.planner_month}`,
						row,
					]),
				);
				const next = (installmentResult.data || [])
					.map((item) => ({
						...item,
						cardId: item.card_id,
						...installmentMonthBounds(item, year),
						monthlyPlan: PLANNER_MONTHS.map(
							(_, index) =>
								monthly.get(`${item.id}:${index + 1}`)?.amount ?? Number(item.monthly || 0),
						),
						paidMonths: PLANNER_MONTHS.map(
							(_, index) => monthly.get(`${item.id}:${index + 1}`)?.paid ?? false,
						),
					}))
					.map((item) => ({
						...item,
						completed: PLANNER_MONTHS.slice(item.startMonth, item.endMonth + 1).every(
							(_, index) => item.paidMonths[item.startMonth + index],
						),
					}));
				if (active) {
					setUser(auth.data.user);
					setCards(cardResult.data || []);
					setInstallments(next);
				}
			} catch (loadError) {
				if (active) {
					setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
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

	const activeInstallments = useMemo(
		() => installments.filter((item) => showCompleted || !item.completed),
		[installments, showCompleted],
	);
	const groups = useMemo(
		() => calculateDashboardTotals(cards, activeInstallments, month),
		[cards, activeInstallments, month],
	);
	const expected = groups.reduce((sum, card) => sum + card.expected, 0);
	const paid = groups.reduce((sum, card) => sum + card.paid, 0);

	async function updateMonth(item, nextPaid, nextAmount) {
		if (!user) {
			return;
		}
		const key = `${item.id}:${month + 1}`;
		setSaving(key);
		const payload = {
			user_id: user.id,
			installment_id: item.id,
			planner_year: year,
			planner_month: month + 1,
			amount: nextAmount ?? Number(item.monthlyPlan[month] || 0),
			paid: nextPaid ?? Boolean(item.paidMonths[month]),
			updated_at: new Date().toISOString(),
		};
		const result = await supabase.from(MONTH_TABLE).upsert(payload);
		if (result.error) {
			setError(result.error.message);
		} else {
			setInstallments((current) =>
				current.map((entry) =>
					entry.id === item.id
						? {
								...entry,
								monthlyPlan: entry.monthlyPlan.map((value, index) =>
									index === month ? payload.amount : value,
								),
								paidMonths: entry.paidMonths.map((value, index) =>
									index === month ? payload.paid : value,
								),
								completed: PLANNER_MONTHS.slice(entry.startMonth, entry.endMonth + 1).every(
									(_, index) =>
										index === month ? payload.paid : entry.paidMonths[entry.startMonth + index],
								),
							}
						: entry,
				),
			);
		}
		setSaving(null);
	}

	if (loading) {
		return <Card className="p-5 text-sm text-muted-foreground">Loading dashboard...</Card>;
	}
	if (error && !cards.length) {
		return <Alert variant="destructive">{error}</Alert>;
	}
	return (
		<div className="space-y-6">
			{error ? <Alert variant="destructive">{error}</Alert> : null}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						aria-label="Previous month"
						onClick={() => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1))}
					>
						<ChevronLeft />
					</Button>
					<h2 className="min-w-36 text-center text-xl font-semibold">
						{PLANNER_MONTHS[month]} {year}
					</h2>
					<Button
						variant="outline"
						size="icon"
						aria-label="Next month"
						onClick={() => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1))}
					>
						<ChevronRight />
					</Button>
				</div>
				<Button variant="ghost" onClick={() => setShowCompleted((value) => !value)}>
					{showCompleted ? <EyeOff /> : <Eye />}{" "}
					{showCompleted ? "Hide completed" : "Show completed"}
				</Button>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground">Expected this month</p>
						<p className="mt-1 text-2xl font-semibold">{amount(expected)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground">Paid</p>
						<p className="mt-1 text-2xl font-semibold text-emerald-300">{amount(paid)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<p className="text-xs text-muted-foreground">Remaining</p>
						<p className="mt-1 text-2xl font-semibold text-violet-300">{amount(expected - paid)}</p>
					</CardContent>
				</Card>
			</div>
			{groups
				.filter((card) => card.items.length)
				.map((card) => (
					<Card key={card.id}>
						<CardHeader className="border-b border-border/70 bg-secondary/20">
							<CardTitle className="flex items-center justify-between">
								<span>{card.name}</span>
								<Badge variant="secondary">{amount(card.expected)}</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 p-4">
							{card.items.map((entry) => {
								const item = entry;
								const isSaving = saving === `${item.id}:${month + 1}`;
								return (
									<div
										key={item.id}
										className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
									>
										<div>
											<p className="font-medium">{item.name}</p>
											<p className="text-xs text-muted-foreground">
												Installment {item.startMonth + 1}–{item.endMonth + 1}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Input
												className="w-28 text-right"
												inputMode="decimal"
												value={formatMoneyInput(item.month.amount)}
												aria-label={`${item.name} amount`}
												onChange={(event) => {
													const value = parseMoneyInput(event.target.value);
													if (value !== null) {
														updateMonth(item, undefined, value);
													}
												}}
											/>
											<Button
												variant={item.month.paid ? "secondary" : "outline"}
												disabled={isSaving}
												onClick={() => updateMonth(item, !item.month.paid)}
											>
												{isSaving ? (
													<LoaderCircle className="animate-spin" />
												) : item.month.paid ? (
													<>
														<Check /> Paid
													</>
												) : (
													<>
														<Circle /> Mark paid
													</>
												)}
											</Button>
										</div>
									</div>
								);
							})}
						</CardContent>
					</Card>
				))}
			{groups.some((card) => card.items.length) ? null : (
				<Card>
					<CardContent className="p-8 text-center text-sm text-muted-foreground">
						No installments planned for this month.
					</CardContent>
				</Card>
			)}
		</div>
	);
}
