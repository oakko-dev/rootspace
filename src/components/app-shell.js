"use client";

import {
	Banknote,
	Binary,
	Calendar,
	FileJson,
	FingerprintPattern,
	Hash,
	HelpCircle,
	IdCard,
	KeyRound,
	LockKeyhole,
	LogIn,
	LogOut,
	Menu,
	NotebookPen,
	PanelsTopLeft,
	User,
	Wallet,
	X,
	ChevronDown,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearBookmarkBoardCache } from "@/lib/bookmark-board-cache";
import {
	BOOKMARK_BOARD_USER_EVENT,
	BOOKMARK_BOARD_USER_KEY,
	clearBookmarkBoardUser,
	parseBookmarkBoardUser,
	readBookmarkBoardUser,
} from "@/lib/bookmark-board-user";
import { toolCatalog } from "@/lib/tool-catalog";
import { cn } from "@/lib/utils";

const TOOL_ICONS = {
	Banknote,
	Binary,
	Calendar,
	FileJson,
	FingerprintPattern,
	Hash,
	IdCard,
	KeyRound,
	LockKeyhole,
	NotebookPen,
	PanelsTopLeft,
	User,
	Wallet,
};

const FOCUS_RING =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const NAV_ITEM_BASE = `group/item relative flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors duration-150 motion-reduce:transition-none ${FOCUS_RING}`;
// Active items get a tinted surface plus a left accent bar instead of a solid fill.
const NAV_ITEM_ACTIVE =
	"bg-primary/12 text-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary";
const NAV_ITEM_IDLE = "text-muted-foreground hover:bg-accent/70 hover:text-foreground";

function NavIcon({ icon: Icon, active }) {
	return (
		<Icon
			size={18}
			strokeWidth={active ? 2.4 : 2}
			aria-hidden="true"
			className={cn(
				"shrink-0 transition-colors duration-150",
				active ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground",
			)}
		/>
	);
}

export default function AppShell({ children }) {
	const pathname = usePathname();
	const [currentUser, setCurrentUser] = useState(null);
	// Remember which path opened the mobile menu so navigating away closes it.
	const [mobileMenuPath, setMobileMenuPath] = useState(null);
	const mobileMenuOpen = mobileMenuPath === pathname;
	const isBookmarkPage = pathname === "/" || pathname === "/start-page";
	const liveTools = toolCatalog.filter((tool) => tool.status === "Ready");
	const navGroups = [];
	for (const tool of liveTools) {
		const groupName = tool.group || "Tools";
		const group = navGroups.find((item) => item.name === groupName);
		if (group) {
			group.items.push(tool);
		} else {
			navGroups.push({ name: groupName, items: [tool] });
		}
	}
	const [collapsedGroups, setCollapsedGroups] = useState(() => {
		if (typeof window === "undefined") {
			return [];
		}
		try {
			const savedGroups = window.localStorage.getItem("rootspace-collapsed-groups");
			return savedGroups ? JSON.parse(savedGroups) : [];
		} catch {
			return [];
		}
	});
	const [collapsedItems, setCollapsedItems] = useState([]);
	const [expandedItems, setExpandedItems] = useState([]);

	function toggleGroup(groupName) {
		setCollapsedGroups((current) => {
			const next = current.includes(groupName)
				? current.filter((name) => name !== groupName)
				: [...current, groupName];
			try {
				window.localStorage.setItem("rootspace-collapsed-groups", JSON.stringify(next));
			} catch {
				// Persistence is optional; the interaction still works in this session.
			}
			return next;
		});
	}

	function toggleItem(itemHref) {
		setCollapsedItems((current) =>
			current.includes(itemHref)
				? current.filter((href) => href !== itemHref)
				: [...current, itemHref],
		);
	}

	function togglePlannerItem(itemKey, activeChild) {
		if (activeChild) {
			toggleItem(itemKey);
			return;
		}
		setExpandedItems((current) =>
			current.includes(itemKey) ? current.filter((key) => key !== itemKey) : [...current, itemKey],
		);
	}

	useEffect(() => {
		const cachedUser = readBookmarkBoardUser();
		const frame = cachedUser
			? window.requestAnimationFrame(() => {
					setCurrentUser({ id: cachedUser.userId, cached: true });
				})
			: 0;

		function syncUserFromStorage(event) {
			if (event.key !== BOOKMARK_BOARD_USER_KEY) {
				return;
			}
			const nextUser = event.newValue ? parseBookmarkBoardUser(event.newValue) : null;
			setCurrentUser(nextUser ? { id: nextUser.userId, cached: true } : null);
		}

		function syncVerifiedUser(event) {
			setCurrentUser(event.detail || null);
		}

		window.addEventListener("storage", syncUserFromStorage);
		window.addEventListener(BOOKMARK_BOARD_USER_EVENT, syncVerifiedUser);
		return () => {
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
			window.removeEventListener("storage", syncUserFromStorage);
			window.removeEventListener(BOOKMARK_BOARD_USER_EVENT, syncVerifiedUser);
		};
	}, []);

	useEffect(() => {
		if (!mobileMenuOpen) {
			return;
		}
		function closeOnEscape(event) {
			if (event.key === "Escape") {
				setMobileMenuPath(null);
			}
		}
		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [mobileMenuOpen]);

	function clearDeviceUser() {
		if (currentUser?.id) {
			clearBookmarkBoardCache(currentUser.id);
		}
		clearBookmarkBoardUser();
	}

	return (
		<main
			aria-label="Rootspace application"
			className="min-h-screen bg-background text-foreground lg:p-4"
			onContextMenu={(event) => event.preventDefault()}
		>
			<div className="grid min-h-screen grid-rows-[auto_1fr] lg:grid-rows-none lg:min-h-[calc(100vh-32px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
				{mobileMenuOpen ? (
					<button
						type="button"
						tabIndex={-1}
						aria-label="Close navigation menu"
						onClick={() => setMobileMenuPath(null)}
						className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
					/>
				) : null}
				<aside className="sticky top-0 z-40 border-b border-border bg-card text-card-foreground shadow-2xl shadow-black/20 lg:top-4 lg:flex lg:h-[calc(100vh-32px)] lg:flex-col lg:rounded-lg lg:border">
					<div className="px-4 py-3 lg:border-b lg:border-border lg:py-4">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary p-2 shadow-lg shadow-primary/20 ring-1 ring-primary/40">
								<Image
									src="/logo.svg"
									alt=""
									width={28}
									height={24}
									priority
									className="h-full w-full object-contain"
								/>
							</div>
							<div className="min-w-0 flex-1">
								<Link
									href="/"
									className={cn(
										"block truncate rounded-sm text-[15px] font-bold tracking-tight hover:text-primary",
										FOCUS_RING,
									)}
									aria-label="Rootspace home"
								>
									Rootspace
								</Link>
								<p className="text-xs text-muted-foreground">{liveTools.length} ready tools</p>
							</div>
							<Badge variant="secondary">v0.1</Badge>
							<button
								type="button"
								aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
								aria-expanded={mobileMenuOpen}
								aria-controls="rootspace-sidebar-menu"
								onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}
								className={cn(
									"-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground lg:hidden",
									mobileMenuOpen && "bg-accent/70 text-foreground",
									FOCUS_RING,
								)}
							>
								{mobileMenuOpen ? (
									<X size={20} aria-hidden="true" />
								) : (
									<Menu size={20} aria-hidden="true" />
								)}
							</button>
						</div>
					</div>

					{/* Below lg this is a dropdown panel under the top bar; from lg up it is the sidebar body. */}
					<div
						id="rootspace-sidebar-menu"
						className={cn(
							"absolute inset-x-0 top-full max-h-[calc(100dvh-4.25rem)] flex-col border-y border-border bg-card shadow-2xl shadow-black/40",
							"lg:static lg:flex lg:max-h-none lg:min-h-0 lg:flex-1 lg:border-0 lg:shadow-none",
							mobileMenuOpen ? "flex" : "hidden",
						)}
					>
						<nav
							aria-label="Rootspace navigation"
							className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 text-sm"
						>
							{navGroups.map((group) => {
								const collapsed = collapsedGroups.includes(group.name);
								const groupHasActive = group.items.some(
									(item) =>
										pathname === item.href ||
										item.children?.some((child) => pathname === child.href),
								);
								return (
									<section key={group.name} aria-label={`${group.name} tools`}>
										<button
											type="button"
											aria-expanded={!collapsed}
											onClick={() => toggleGroup(group.name)}
											className={cn(
												"group/header mb-1.5 flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 transition-colors hover:text-foreground motion-reduce:transition-none",
												FOCUS_RING,
											)}
										>
											<span className="flex-1 text-left">{group.name}</span>
											{collapsed ? (
												<span className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tracking-normal text-secondary-foreground">
													{groupHasActive ? (
														<span
															className="h-1.5 w-1.5 rounded-full bg-primary"
															aria-hidden="true"
														/>
													) : null}
													{group.items.length}
												</span>
											) : null}
											<ChevronDown
												size={14}
												className={cn(
													"transition-transform duration-200 motion-reduce:transition-none group-hover/header:text-foreground",
													collapsed && "-rotate-90",
												)}
												aria-hidden="true"
											/>
										</button>
										<div
											className={cn(
												"space-y-0.5 overflow-hidden transition-[max-height,opacity] duration-200 motion-reduce:transition-none",
												collapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
											)}
										>
											{group.items.map((item) => {
												const itemKey = item.href || item.name;
												const active = pathname === item.href;
												const activeChild = item.children?.some((child) => pathname === child.href);
												const itemExpanded = activeChild
													? !collapsedItems.includes(itemKey)
													: expandedItems.includes(itemKey);
												const Icon = TOOL_ICONS[item.icon] || HelpCircle;
												return (
													<div key={item.href}>
														{item.children ? (
															<button
																type="button"
																aria-label={`${itemExpanded ? "Collapse" : "Expand"} ${item.name} submenu`}
																aria-expanded={itemExpanded}
																onClick={() => togglePlannerItem(itemKey, activeChild)}
																className={cn(
																	NAV_ITEM_BASE,
																	"text-left",
																	active || activeChild ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
																)}
															>
																<NavIcon icon={Icon} active={active || activeChild} />
																<span className="flex-1 truncate">{item.name}</span>
																<ChevronDown
																	size={15}
																	className={cn(
																		"shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
																		!itemExpanded && "-rotate-90",
																	)}
																	aria-hidden="true"
																/>
															</button>
														) : (
															<Link
																href={item.href}
																aria-current={active ? "page" : undefined}
																className={cn(
																	NAV_ITEM_BASE,
																	active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE,
																)}
															>
																<NavIcon icon={Icon} active={active} />
																<span className="truncate">{item.name}</span>
															</Link>
														)}
														{item.children ? (
															<div
																className={cn(
																	"ml-[21px] space-y-0.5 overflow-hidden border-l border-border pl-3 transition-[max-height,opacity,margin] duration-200 motion-reduce:transition-none",
																	itemExpanded
																		? "mt-0.5 max-h-48 opacity-100"
																		: "max-h-0 opacity-0",
																)}
															>
																{item.children.map((child) => {
																	const childActive = pathname === child.href;
																	return (
																		<Link
																			key={child.href}
																			href={child.href}
																			aria-current={childActive ? "page" : undefined}
																			className={cn(
																				"relative flex min-h-9 items-center rounded-md px-3 text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none",
																				FOCUS_RING,
																				childActive
																					? "bg-primary/10 text-primary before:absolute before:top-1/2 before:-left-[15px] before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
																					: "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
																			)}
																		>
																			{child.name}
																		</Link>
																	);
																})}
															</div>
														) : null}
													</div>
												);
											})}
										</div>
									</section>
								);
							})}
						</nav>

						<div className="border-t border-border p-3">
							<div className="flex items-center gap-3 rounded-lg bg-muted/60 p-2">
								<div
									className={cn(
										"flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ring-1",
										currentUser
											? "bg-primary/15 text-primary ring-primary/30"
											: "bg-secondary text-secondary-foreground ring-border",
									)}
								>
									{currentUser ? "IN" : "RS"}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-foreground">
										{currentUser?.email ?? (currentUser ? "Cached session" : "Guest")}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{currentUser?.email
											? "supabase session"
											: currentUser
												? "verifying session"
												: "not authenticated"}
									</p>
								</div>
								{currentUser ? (
									<form action={signOut} onSubmit={clearDeviceUser}>
										<Button
											variant="ghost"
											size="sm"
											className="font-mono text-xs text-muted-foreground"
											type="submit"
										>
											<LogOut size={14} />
											<span>out</span>
										</Button>
									</form>
								) : (
									<Link
										className={cn(
											"inline-flex h-9 items-center gap-1 rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
											FOCUS_RING,
										)}
										href="/login"
									>
										<LogIn size={14} />
										<span>in</span>
									</Link>
								)}
							</div>
						</div>
					</div>
				</aside>

				<div
					className={cn(
						"flex w-full min-w-0 flex-col",
						isBookmarkPage ? "max-w-none" : "max-w-none gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8",
					)}
				>
					{children}
				</div>
			</div>
		</main>
	);
}
