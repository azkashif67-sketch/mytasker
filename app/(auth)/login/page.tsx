"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Single-user email + password sign-in. There is no sign-up screen — the one
// account is created from the Supabase dashboard with public sign-ups off.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "signing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setState("signing");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      setState("error");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-ground p-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-display mb-1">Minute</h1>
        <p className="text-ink-soft text-ui mb-8">A personal task &amp; learning planner.</p>

        <form onSubmit={signIn} className="flex flex-col gap-3">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-rule bg-surface px-3 py-2 text-ui"
          />

          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-rule bg-surface px-3 py-2 text-ui"
          />

          <button
            type="submit"
            disabled={state === "signing"}
            className="rounded bg-ink px-3 py-2 text-ui text-surface disabled:opacity-60"
          >
            {state === "signing" ? "Signing in…" : "Sign in"}
          </button>

          {error && (
            <p className="text-ui text-conflict" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
