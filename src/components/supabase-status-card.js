import { checkSupabaseHealth } from "@/lib/supabase-health";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const toneByStatus = {
  connected: "success",
  "not-configured": "warning",
  error: "destructive",
};

export default async function SupabaseStatusCard() {
  const result = await checkSupabaseHealth();
  const checkedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Supabase connection</CardTitle>
          <CardDescription>Checked {checkedAt}</CardDescription>
        </div>
        <Badge variant={toneByStatus[result.status]}>{result.status}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{result.message}</p>

      <dl className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-3">
          <dt className="font-medium text-foreground">URL configured</dt>
          <dd className="mt-1">
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? "yes" : "no"}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <dt className="font-medium text-foreground">Anon key configured</dt>
          <dd className="mt-1">
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "yes" : "no"}
          </dd>
        </div>
      </dl>
      </CardContent>
    </Card>
  );
}
