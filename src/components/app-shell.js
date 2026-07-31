"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { toolCatalog } from "@/lib/tool-catalog";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearBookmarkBoardCache } from "@/lib/bookmark-board-cache";
import { cn } from "@/lib/utils";

export default function AppShell({ children, currentUser }) {
  const pathname = usePathname();
  const isBookmarkPage = pathname === "/" || pathname === "/start-page";
  const liveTools = toolCatalog.filter((tool) => {
    if (tool.status !== "Ready") return false;
    if (tool.authRequired && !currentUser) return false;
    return true;
  });
  const navItems = liveTools;

  return (
    <main
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
                <p className="text-xs text-muted-foreground">
                  {liveTools.length} ready tools
                </p>
              </div>
              <Badge variant="secondary">v0.1</Badge>
            </div>
          </div>

          <nav
            aria-label="Rootspace navigation"
            className="flex-1 space-y-5 overflow-y-auto p-3 text-sm"
          >
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = Icons[item.icon] || Icons.HelpCircle;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-primary-foreground" : "text-muted-foreground"}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>

          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary font-mono text-xs font-black text-secondary-foreground">
                {currentUser ? "IN" : "RS"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentUser?.email ?? "Guest"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentUser ? "supabase session" : "not authenticated"}
                </p>
              </div>
              {currentUser ? (
                <form
                  action={signOut}
                  onSubmit={() => clearBookmarkBoardCache(currentUser.id)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs text-muted-foreground"
                    type="submit"
                  >
                    <Icons.LogOut size={14} />
                    <span>out</span>
                  </Button>
                </form>
              ) : (
                <Link
                  className="inline-flex h-9 items-center gap-1 rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  href="/login"
                >
                  <Icons.LogIn size={14} />
                  <span>in</span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div
          className={cn(
            "flex w-full min-w-0 flex-col",
            isBookmarkPage
              ? "max-w-none"
              : "max-w-none gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8",
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
