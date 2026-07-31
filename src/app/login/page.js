import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        eyebrow="rootspace / auth"
        title="Authenticate with Supabase"
        description="Sign in to attach this console to your Supabase user session."
      />
      <AuthForm />
    </div>
  );
}
