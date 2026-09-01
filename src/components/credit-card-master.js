"use client";

import { CreditCard, LoaderCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABLE = "financial_planner_cards";
const INSTALLMENTS_TABLE = "financial_planner_installments";

export default function CreditCardMaster() {
	const [supabase, setSupabase] = useState(() => createSupabaseBrowserClient());
	void setSupabase;
	const [user, setUser] = useState(null);
	const [cards, setCards] = useState([]);
	const [installments, setInstallments] = useState([]);
	const [dialog, setDialog] = useState({ open: false, card: null });
	const [form, setForm] = useState({ name: "", color: "#65d9f2" });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		async function load() {
			try {
				const { data: auth, error: authError } = await supabase.auth.getUser();
				if (authError || !auth.user) {
					throw new Error("You must be logged in to manage cards.");
				}
				const [cardsResult, installmentsResult] = await Promise.all([
					supabase.from(TABLE).select("*").eq("user_id", auth.user.id).order("name"),
					supabase.from(INSTALLMENTS_TABLE).select("card_id").eq("user_id", auth.user.id),
				]);
				if (cardsResult.error) {
					throw cardsResult.error;
				}
				if (installmentsResult.error) {
					throw installmentsResult.error;
				}
				setUser(auth.user);
				setCards(cardsResult.data || []);
				setInstallments(installmentsResult.data || []);
			} catch (loadError) {
				setError(loadError instanceof Error ? loadError.message : "Unable to load cards.");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [supabase]);

	function openAdd() {
		setForm({ name: "", color: "#65d9f2" });
		setDialog({ open: true, card: null });
	}

	function openEdit(card) {
		setForm({ name: card.name, color: card.color || "#65d9f2" });
		setDialog({ open: true, card });
	}

	async function saveCard(event) {
		event.preventDefault();
		const name = form.name.trim();
		if (!name || !user) {
			return;
		}
		setSaving(true);
		const payload = { name, color: form.color };
		const result = dialog.card
			? await supabase.from(TABLE).update(payload).eq("user_id", user.id).eq("id", dialog.card.id)
			: await supabase
					.from(TABLE)
					.insert({ ...payload, user_id: user.id, id: crypto.randomUUID() });
		if (result.error) {
			setError(result.error.message);
			setSaving(false);
			return;
		}
		setDialog({ open: false, card: null });
		window.location.reload();
	}

	async function deleteCard(card) {
		if (installments.some((item) => item.card_id === card.id)) {
			setError(`Cannot delete ${card.name} because it is used by an installment.`);
			return;
		}
		const result = await supabase.from(TABLE).delete().eq("user_id", user.id).eq("id", card.id);
		if (result.error) {
			setError(result.error.message);
			return;
		}
		setCards((current) => current.filter((item) => item.id !== card.id));
	}

	if (loading) {
		return <Card className="p-5 text-sm text-muted-foreground">Loading cards...</Card>;
	}
	if (error && !cards.length) {
		return <Alert variant="destructive">{error}</Alert>;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-lg shadow-black/10 sm:p-6">
				<div>
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
						<CreditCard className="size-4" /> Payment accounts
					</div>
					<h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
						Credit Card Master
					</h2>
					<p className="mt-2 max-w-xl text-sm text-muted-foreground">
						Keep your cards organized so installment plans stay easy to understand.
					</p>
				</div>
				<Button type="button" onClick={openAdd} className="min-h-11">
					<Plus className="size-4" /> Add card
				</Button>
			</div>
			{error ? <Alert variant="destructive">{error}</Alert> : null}
			<Card className="overflow-hidden">
				<CardHeader className="border-b border-border/70 bg-secondary/20">
					<CardTitle className="flex items-center gap-2">
						<ShieldCheck className="size-5 text-emerald-300" /> Your cards
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						{cards.length} payment account{cards.length === 1 ? "" : "s"} connected to your planner
					</p>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{cards.length ? (
						cards.map((card) => (
							<div
								key={card.id}
								className="group rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/50 hover:bg-accent/30"
							>
								<div className="flex items-center gap-3">
									<span
										className="flex size-10 items-center justify-center rounded-xl"
										style={{ backgroundColor: `${card.color}22`, color: card.color }}
									>
										<CreditCard className="size-5" />
									</span>
									<div>
										<p className="font-semibold">{card.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{installments.filter((item) => item.card_id === card.id).length} installment
											plans
										</p>
									</div>
								</div>
								<div className="mt-4 flex gap-2">
									<Button variant="outline" size="sm" onClick={() => openEdit(card)}>
										Edit
									</Button>
									<Button variant="ghost" size="sm" onClick={() => deleteCard(card)}>
										<Trash2 className="size-4" /> Delete
									</Button>
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">No cards yet.</p>
					)}
				</CardContent>
			</Card>
			<Dialog
				open={dialog.open}
				onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
			>
				<DialogContent className="max-w-md overflow-hidden border-border/80 bg-card p-0">
					<DialogHeader className="mb-0 border-b border-border/70 bg-gradient-to-br from-secondary/60 to-card px-6 py-5">
						<div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<CreditCard className="size-5" />
						</div>
						<DialogTitle>{dialog.card ? "Edit card" : "Add card"}</DialogTitle>
						<p className="text-sm leading-5 text-muted-foreground">
							Choose a name and color so payments are easy to scan in your planner.
						</p>
					</DialogHeader>
					<form className="space-y-5 p-6" onSubmit={saveCard}>
						<div className="space-y-2">
							<Label htmlFor="card-name">Card name</Label>
							<Input
								id="card-name"
								value={form.name}
								onChange={(event) =>
									setForm((current) => ({ ...current, name: event.target.value }))
								}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="card-color">Card color</Label>
							<Input
								id="card-color"
								type="color"
								value={form.color}
								onChange={(event) =>
									setForm((current) => ({ ...current, color: event.target.value }))
								}
								className="h-10 w-20 p-1"
							/>
						</div>
						<div className="flex justify-end gap-2 border-t border-border/70 pt-4">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setDialog((current) => ({ ...current, open: false }))}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={saving}>
								{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
								{saving ? "Saving..." : dialog.card ? "Save changes" : "Add card"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
