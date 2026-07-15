import { checkSupabaseHealth } from "@/lib/supabase-health";

const toneByStatus = {
  connected: "bg-[#76efaa]/15 text-[#76efaa]",
  "not-configured": "bg-[#f7c65b]/15 text-[#f7c65b]",
  error: "bg-[#ff8f7a]/15 text-[#ff8f7a]",
};

export default async function SupabaseStatusCard() {
  const result = await checkSupabaseHealth();
  const checkedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section className="rounded-lg border border-[#2f7b57] bg-[#1b1f18] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-[#eef4e8]">
          Supabase connection
        </h2>
        <span
          className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${toneByStatus[result.status]}`}
        >
          {result.status}
        </span>
        <p className="font-mono text-xs text-[#87917d]">Checked {checkedAt}</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#aab5a0]">{result.message}</p>

      <dl className="mt-6 grid gap-3 text-sm text-[#aab5a0] sm:grid-cols-2">
        <div className="rounded-lg border border-[#343b2f] bg-[#11130f] p-3">
          <dt className="font-medium text-[#eef4e8]">URL configured</dt>
          <dd className="mt-1">
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? "yes" : "no"}
          </dd>
        </div>
        <div className="rounded-lg border border-[#343b2f] bg-[#11130f] p-3">
          <dt className="font-medium text-[#eef4e8]">Anon key configured</dt>
          <dd className="mt-1">
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "yes" : "no"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
