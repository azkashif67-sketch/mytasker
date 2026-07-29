"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      onClick={signOut}
      className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-ui text-ink-soft hover:text-ink"
      aria-label="Sign out"
    >
      <LogOut size={16} aria-hidden />
      Sign out
    </button>
  );
}
