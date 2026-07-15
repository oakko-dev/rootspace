"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";

const initialState = { status: "idle", message: "" };

export default function AuthForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <section className="rounded-lg border border-[#343b2f] bg-[#1b1f18] p-5">
      <form action={action} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[#eef4e8]" htmlFor="email">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-[#343b2f] bg-[#11130f] px-3 py-2 text-[#eef4e8] outline-none transition placeholder:text-[#87917d] focus:border-[#65d9f2]"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#eef4e8]" htmlFor="password">
            Password
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-[#343b2f] bg-[#11130f] px-3 py-2 text-[#eef4e8] outline-none transition placeholder:text-[#87917d] focus:border-[#65d9f2]"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>

        {state.message ? (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              state.status === "success"
                ? "border-[#2f7b57] bg-[#76efaa]/10 text-[#76efaa]"
                : "border-[#7b3b2f] bg-[#ff8f7a]/10 text-[#ff8f7a]"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-[#c8ff65] px-4 py-2.5 text-sm font-bold text-[#11130f] transition hover:bg-[#d8ff8a] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Working..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
