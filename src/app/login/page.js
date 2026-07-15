import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="border-b border-[#343b2f] pb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#65d9f2]">
          rootspace / auth
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#eef4e8] sm:text-4xl">
          Authenticate with Supabase.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#aab5a0]">
          Sign in to attach this console to your Supabase user session.
        </p>
      </header>
      <AuthForm />
    </div>
  );
}
