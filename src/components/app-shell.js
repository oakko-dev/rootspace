"use client";

import {
	Calendar,
	FileJson,
	HelpCircle,
	LogIn,
	LogOut,
	PanelsTopLeft,
	User,
	Wallet,
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

const TOOL_ICONS = { Calendar, FileJson, PanelsTopLeft, User, Wallet };

export default function AppShell({ children }) {
	const pathname = usePathname();
	const [currentUser, setCurrentUser] = useState(null);
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
			<div className="grid min-h-screen lg:min-h-[calc(100vh-32px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
				<aside className="border-border bg-card text-card-foreground shadow-2xl shadow-black/20 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-32px)] lg:flex-col lg:rounded-lg lg:border">
					<div className="border-b border-border p-3">
						<div className="flex items-center gap-2">
							<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary p-1.5">
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
									className="block truncate text-sm font-bold"
									aria-label="Rootspace home"
								>
									Rootspace
								</Link>
								<p className="text-xs text-muted-foreground">{liveTools.length} ready tools</p>
							</div>
							<Badge variant="secondary">v0.1</Badge>
						</div>
					</div>

					<nav
						aria-label="Rootspace navigation"
						className="flex-1 space-y-4 overflow-y-auto p-3 text-sm"
					>
						{navGroups.map((group) => {
							const collapsed = collapsedGroups.includes(group.name);
							return (
								<section key={group.name} aria-label={`${group.name} tools`}>
									<button
										type="button"
										aria-expanded={!collapsed}
										onClick={() => toggleGroup(group.name)}
										className="mb-1 flex min-h-9 w-full items-center justify-between rounded-md px-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
									>
										<span>{group.name}</span>
										<ChevronDown
											size={15}
											className={cn("transition-transform duration-200", collapsed && "-rotate-90")}
											aria-hidden="true"
										/>
									</button>
									<div
										className={cn(
											"space-y-1 overflow-hidden transition-[max-height,opacity] duration-200",
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
																"flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
																active || activeChild
																	? "bg-primary text-primary-foreground"
																	: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
															)}
														>
															<Icon size={18} strokeWidth={active || activeChild ? 2.5 : 2} />
															<span className="flex-1 truncate">{item.name}</span>
															<ChevronDown
																size={15}
																className={cn(
																	"transition-transform duration-200",
																	!itemExpanded && "-rotate-90",
																)}
																aria-hidden="true"
															/>
														</button>
													) : (
														<Link
															href={item.href}
															className={cn(
																"flex min-h-11 min-w-0 items-center gap-2 rounded-md px-2.5 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
																active
																	? "bg-primary text-primary-foreground"
																	: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
															)}
														>
															<Icon size={18} strokeWidth={active ? 2.5 : 2} />
															<span className="truncate">{item.name}</span>
														</Link>
													)}
													{item.children ? (
														<div
															className={cn(
																"ml-8 space-y-1 overflow-hidden border-l border-border pl-2 transition-[max-height,opacity] duration-200",
																itemExpanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
															)}
														>
															{item.children.map((child) => (
																<Link
																	key={child.href}
																	href={child.href}
																	className={cn(
																		"block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
																		pathname === child.href
																			? "bg-primary/15 text-primary"
																			: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
																	)}
																>
																	{child.name}
																</Link>
															))}
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
						<div className="flex items-center gap-2">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary font-mono text-xs font-black text-secondary-foreground">
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
									className="inline-flex h-9 items-center gap-1 rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
									href="/login"
								>
									<LogIn size={14} />
									<span>in</span>
								</Link>
							)}
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
