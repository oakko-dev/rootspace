import Link from "next/link";
import SupabaseStatusCard from "@/components/supabase-status-card";
import { toolCatalog } from "@/lib/tool-catalog";
import * as Icons from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const readyTools = toolCatalog.filter((tool) => tool.status === "Ready");
  const plannedTools = toolCatalog.filter((tool) => tool.status !== "Ready");

  return (
    <>
      <header className="grid gap-6 border-b border-[#343b2f] pb-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#65d9f2]">
            rootspace / dashboard
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-normal text-[#eef4e8] sm:text-5xl">
            Personal tools wired into one fast console.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#aab5a0]">
            Open the daily utilities, check project connectivity, and keep
            upcoming finance tools visible without leaving the grid.
          </p>
        </div>
        <section className="rounded-lg border border-[#343b2f] bg-[#1b1f18] p-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#87917d]">
            Tool inventory
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#343b2f] bg-[#11130f] p-3">
              <p className="font-mono text-xs uppercase text-[#87917d]">Ready</p>
              <p className="mt-2 text-3xl font-bold text-[#f7c65b]">
                {String(readyTools.length).padStart(2, "0")}
              </p>
            </div>
            <div className="rounded-lg border border-[#343b2f] bg-[#11130f] p-3">
              <p className="font-mono text-xs uppercase text-[#87917d]">Soon</p>
              <p className="mt-2 text-3xl font-bold text-[#f7c65b]">
                {String(plannedTools.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </section>
      </header>

      <SupabaseStatusCard />

      <section className="grid gap-4 md:grid-cols-2">
        {toolCatalog.map((tool) => {
          const Icon = Icons[tool.icon] || Icons.HelpCircle;
          const content = (
            <article className="group h-full rounded-lg border border-[#343b2f] bg-[#1b1f18] p-5 transition hover:border-[#65d9f2]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20251d] text-[#87917d] transition group-hover:bg-[#65d9f2]/10 group-hover:text-[#65d9f2]">
                    <Icon size={24} />
                  </div>
                  <h2 className="text-xl font-semibold text-[#eef4e8]">
                    {tool.name}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
                    tool.status === "Ready"
                      ? "bg-[#65d9f2]/15 text-[#65d9f2]"
                      : "bg-[#f7c65b]/15 text-[#f7c65b]"
                  }`}
                >
                  {tool.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#aab5a0]">
                {tool.description}
              </p>
              <p className="mt-6 font-mono text-xs text-[#87917d]">
                {tool.href ?? "queued"}
              </p>
            </article>
          );

          return tool.href ? (
            <Link key={tool.name} href={tool.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={tool.name}>{content}</div>
          );
        })}
      </section>
    </>
  );
}
