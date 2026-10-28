"use client";

import { Code, Eye, FileText, NotebookPen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CopyButton from "@/components/copy-button";
import { splitNoteBlocks } from "@/lib/note-blocks";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TABLE = "rootspace_notes";
const AUTOSAVE_DELAY_MS = 800;
const COPIED_RESET_MS = 1500;
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function formatDate(value) {
	return DATE_FORMAT.format(new Date(value));
}

// First line of prose for the list preview, skipping code fences.
function noteSnippet(body) {
	return body
		.split("\n")
		.map((line) => line.trim())
		.find((line) => line && !line.startsWith("```"));
}

function NoteCodeBlock({ lang, content }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(content);
		setCopied(true);
		setTimeout(() => setCopied(false), COPIED_RESET_MS);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-border bg-secondary/40">
			<div className="flex items-center justify-between border-b border-border/70 px-3 py-1">
				<span className="font-mono text-xs text-muted-foreground">{lang || "code"}</span>
				<CopyButton copied={copied} label="Copy code" onClick={copy} />
			</div>
			<pre className="overflow-x-auto p-3 font-mono text-[13px] leading-5">
				<code>{content}</code>
			</pre>
		</div>
	);
}

export default function NotesTool() {
	const supabase = useMemo(() => createSupabaseBrowserClient(), []);
	const [user, setUser] = useState(null);
	const [notes, setNotes] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [status, setStatus] = useState("Saved");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [previewing, setPreviewing] = useState(true);
	const bodyRef = useRef(null);
	const dirtyIds = useRef(new Set());

	useEffect(() => {
		async function load() {
			try {
				const { data: auth, error: authError } = await supabase.auth.getUser();
				if (authError || !auth.user) {
					throw new Error("You must be logged in to use notes.");
				}
				const { data, error: notesError } = await supabase
					.from(TABLE)
					.select("*")
					.eq("user_id", auth.user.id)
					.order("updated_at", { ascending: false });
				if (notesError) {
					throw notesError;
				}
				setUser(auth.user);
				setNotes(data || []);
				setActiveId(data?.[0]?.id ?? null);
			} catch (loadError) {
				setError(loadError instanceof Error ? loadError.message : "Unable to load notes.");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [supabase]);

	// Debounced autosave: every edit resets the timer, then all edited notes are written at once.
	useEffect(() => {
		if (!(user && dirtyIds.current.size)) {
			return;
		}
		setStatus("Saving...");
		const timer = setTimeout(async () => {
			const rows = notes
				.filter((note) => dirtyIds.current.has(note.id))
				.map(({ id, title, body, updated_at }) => ({ user_id: user.id, id, title, body, updated_at }));
			dirtyIds.current.clear();
			const result = await supabase.from(TABLE).upsert(rows);
			if (result.error) {
				for (const row of rows) {
					dirtyIds.current.add(row.id);
				}
				setError(result.error.message);
				setStatus("Not saved");
				return;
			}
			setStatus("Saved");
		}, AUTOSAVE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [notes, supabase, user]);

	function editActive(field, value) {
		dirtyIds.current.add(activeId);
		setNotes((current) =>
			current.map((note) =>
				note.id === activeId ? { ...note, [field]: value, updated_at: new Date().toISOString() } : note,
			),
		);
	}

	// Wraps the selection (or an empty line) in ``` fences and puts the cursor inside.
	function insertCodeBlock() {
		const textarea = bodyRef.current;
		const note = notes.find((item) => item.id === activeId);
		if (!(textarea && note)) {
			return;
		}
		const { selectionStart: start, selectionEnd: end } = textarea;
		const before = note.body.slice(0, start);
		const selected = note.body.slice(start, end);
		const prefix = before && !before.endsWith("\n") ? "\n```\n" : "```\n";
		const next = `${before}${prefix}${selected}\n\`\`\`\n${note.body.slice(end)}`;
		const cursor = start + prefix.length + selected.length;
		editActive("body", next);
		requestAnimationFrame(() => {
			textarea.focus();
			textarea.setSelectionRange(cursor, cursor);
		});
	}

	function createNote() {
		const note = {
			id: crypto.randomUUID(),
			title: "",
			body: "",
			updated_at: new Date().toISOString(),
		};
		dirtyIds.current.add(note.id);
		setNotes((current) => [note, ...current]);
		setActiveId(note.id);
		setPreviewing(false);
		setQuery("");
	}

	async function deleteNote(note) {
		// First click arms the button, second click deletes.
		if (!confirmingDelete) {
			setConfirmingDelete(true);
			return;
		}
		setConfirmingDelete(false);
		dirtyIds.current.delete(note.id);
		const result = await supabase.from(TABLE).delete().eq("user_id", user.id).eq("id", note.id);
		if (result.error) {
			setError(result.error.message);
			return;
		}
		const remaining = notes.filter((item) => item.id !== note.id);
		setNotes(remaining);
		setActiveId(remaining[0]?.id ?? null);
	}

	if (loading) {
		return <Card className="p-5 text-sm text-muted-foreground">Loading notes...</Card>;
	}
	if (!user) {
		return <Alert variant="destructive">{error}</Alert>;
	}

	const search = query.trim().toLowerCase();
	const visibleNotes = search
		? notes.filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(search))
		: notes;
	const activeNote = notes.find((note) => note.id === activeId);

	const wordCount = activeNote?.body.trim() ? activeNote.body.trim().split(/\s+/u).length : 0;

	return (
		<div className="space-y-4">
			{error ? <Alert variant="destructive">{error}</Alert> : null}
			<div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/10 lg:h-[calc(100vh-14rem)] lg:min-h-[32rem] lg:grid-cols-[18rem_1fr]">
				<aside className="flex min-h-0 flex-col border-b border-border bg-secondary/20 lg:border-r lg:border-b-0">
					<div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
							<NotebookPen className="size-4" aria-hidden="true" /> Vault
							<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] tracking-normal">
								{notes.length}
							</span>
						</div>
						<Button
							type="button"
							size="icon"
							aria-label="New note"
							title="New note"
							onClick={createNote}
							className="size-11 lg:size-9"
						>
							<Plus className="size-4" />
						</Button>
					</div>
					<div className="px-4 pb-3">
						<div className="relative">
							<Search
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								type="search"
								aria-label="Search notes"
								placeholder="Search notes"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								className="h-11 bg-background/60 pl-9 lg:h-9"
							/>
						</div>
					</div>
					<nav
						aria-label="Notes"
						className="flex max-h-72 min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3 lg:max-h-none"
					>
						{visibleNotes.length ? (
							visibleNotes.map((note) => {
								const active = note.id === activeId;
								return (
									<button
										key={note.id}
										type="button"
										onClick={() => setActiveId(note.id)}
										aria-current={active ? "page" : undefined}
										className={cn(
											"group relative flex min-h-11 flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
											active && "bg-accent/70 text-accent-foreground",
										)}
									>
										<span
											className={cn(
												"absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity",
												active && "opacity-100",
											)}
											aria-hidden="true"
										/>
										<span className="flex items-center justify-between gap-2">
											<span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
											<span className="shrink-0 text-[11px] text-muted-foreground">
												{formatDate(note.updated_at)}
											</span>
										</span>
										<span className="truncate text-xs text-muted-foreground">
											{noteSnippet(note.body) || "Empty note"}
										</span>
									</button>
								);
							})
						) : (
							<div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
								<FileText className="size-6 opacity-60" aria-hidden="true" />
								{notes.length ? `No notes match "${query.trim()}".` : "No notes yet."}
							</div>
						)}
					</nav>
				</aside>
				<section aria-label="Editor" className="flex min-h-[28rem] min-w-0 flex-col">
					{activeNote ? (
						<>
							<div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2">
								<fieldset className="m-0 flex min-w-0 rounded-lg border border-border bg-background/50 p-0.5">
									<legend className="sr-only">View mode</legend>
									{[
										{ label: "Write", icon: Pencil, preview: false },
										{ label: "Preview", icon: Eye, preview: true },
									].map(({ label, icon: Icon, preview }) => (
										<button
											key={label}
											type="button"
											aria-pressed={previewing === preview}
											onClick={() => setPreviewing(preview)}
											className={cn(
												"flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
												previewing === preview && "bg-secondary text-foreground shadow-sm",
											)}
										>
											<Icon className="size-3.5" aria-hidden="true" /> {label}
										</button>
									))}
								</fieldset>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={insertCodeBlock}
									disabled={previewing}
									className="min-h-9"
								>
									<Code className="size-4" /> Code block
								</Button>
								<span
									className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"
									aria-live="polite"
								>
									<span
										className={cn(
											"size-1.5 rounded-full",
											status === "Saved" && "bg-emerald-400",
											status === "Saving..." && "animate-pulse bg-amber-400",
											status === "Not saved" && "bg-destructive",
										)}
										aria-hidden="true"
									/>
									{status}
								</span>
								<Button
									type="button"
									variant={confirmingDelete ? "destructive" : "ghost"}
									size={confirmingDelete ? "sm" : "icon"}
									aria-label={confirmingDelete ? "Confirm delete note" : "Delete note"}
									title="Delete note"
									onClick={() => deleteNote(activeNote)}
									onBlur={() => setConfirmingDelete(false)}
									className={cn("min-h-9", !confirmingDelete && "text-muted-foreground hover:text-destructive")}
								>
									<Trash2 className="size-4" />
									{confirmingDelete ? "Delete?" : null}
								</Button>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto">
								<div className="mx-auto flex h-full w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-8">
									<Input
										aria-label="Note title"
										placeholder="Untitled"
										value={activeNote.title}
										onChange={(event) => editActive("title", event.target.value)}
										readOnly={previewing}
										className="h-auto border-none bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 sm:text-3xl"
									/>
									<p className="mt-1 mb-5 text-xs text-muted-foreground">
										Edited {formatDate(activeNote.updated_at)} · {wordCount} word
										{wordCount === 1 ? "" : "s"}
									</p>
									{previewing ? (
										<div className="flex-1 space-y-4 text-base leading-7">
											{activeNote.body.trim() ? (
												splitNoteBlocks(activeNote.body).map((block, index) =>
													block.type === "code" ? (
														<NoteCodeBlock key={index} lang={block.lang} content={block.content} />
													) : (
														<p key={index} className="whitespace-pre-wrap">
															{block.content}
														</p>
													),
												)
											) : (
												<p className="text-muted-foreground">Nothing to preview yet.</p>
											)}
										</div>
									) : (
										<Textarea
											ref={bodyRef}
											aria-label="Note body"
											placeholder="Start writing... Use ``` to start a code block."
											value={activeNote.body}
											onChange={(event) => editActive("body", event.target.value)}
											className="min-h-72 flex-1 resize-none border-none bg-transparent px-0 py-0 text-base leading-7 shadow-none focus-visible:ring-0"
										/>
									)}
								</div>
							</div>
						</>
					) : (
						<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
							<span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<NotebookPen className="size-7" aria-hidden="true" />
							</span>
							<div>
								<p className="font-semibold">No note open</p>
								<p className="mt-1 text-sm text-muted-foreground">
									Pick a note from the vault or start a new one.
								</p>
							</div>
							<Button type="button" onClick={createNote} className="min-h-11">
								<Plus className="size-4" /> New note
							</Button>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
