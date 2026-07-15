"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { toolCatalog } from "@/lib/tool-catalog";
import * as Icons from "lucide-react";

export default function AppShell({ children, currentUser }) {
  const pathname = usePathname();
  const liveTools = toolCatalog.filter((tool) => tool.status === "Ready");
  const navItems = [
    { name: "Dashboard", href: "/", icon: "LayoutDashboard" },
    ...liveTools,
  ];

  return (
    <main className="min-h-screen bg-[#11130f] text-[#eef4e8] lg:p-4">
      <div className="grid min-h-screen lg:min-h-[calc(100vh-32px)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
        <aside className="border-[#343b2f] bg-[#1b1f18] text-[#eef4e8] shadow-2xl shadow-black/20 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-32px)] lg:flex-col lg:rounded-xl lg:border">
          <div className="border-b border-[#343b2f] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c8ff65] font-mono text-[11px] font-black text-[#11130f]">
                RS
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href="/"
                  className="block truncate text-sm font-bold"
                  aria-label="Rootspace dashboard"
                >
                  Rootspace
                </Link>
                <p className="text-xs text-[#87917d]">
                  {liveTools.length} ready tools
                </p>
              </div>
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
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium transition ${
                      active
                        ? "bg-[#c8ff65] text-[#11130f]"
                        : "text-[#aab5a0] hover:bg-[#20251d] hover:text-[#65d9f2]"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? "text-[#11130f]" : "text-[#87917d]"}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>

          </nav>

          <div className="border-t border-[#343b2f] p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c8ff65] font-mono text-xs font-black text-[#11130f]">
                {currentUser ? "IN" : "RS"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#eef4e8]">
                  {currentUser?.email ?? "Guest"}
                </p>
                <p className="truncate text-xs text-[#87917d]">
                  {currentUser ? "supabase session" : "not authenticated"}
                </p>
              </div>
              {currentUser ? (
                <form action={signOut}>
                  <button
                    className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-[#87917d] transition hover:bg-[#20251d] hover:text-[#65d9f2]"
                    type="submit"
                  >
                    <Icons.LogOut size={14} />
                    <span>out</span>
                  </button>
                </form>
              ) : (
                <Link
                  className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-[#87917d] transition hover:bg-[#20251d] hover:text-[#65d9f2]"
                  href="/login"
                >
                  <Icons.LogIn size={14} />
                  <span>in</span>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </div>
    </main>
  );
}
