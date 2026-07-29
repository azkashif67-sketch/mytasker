import { todayPKT, fmtDay } from "@/lib/pkt-dates";
import { SignOutButton } from "@/components/SignOutButton";

// The only screen. M0 renders the header scaffold and the PKT date; the
// sections, shared calendar and Minute Ledger arrive in M2–M4.
export default function HomePage() {
  const today = todayPKT();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-rule pb-4">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-head">Minute</span>
          <span className="font-display text-ui text-ink-soft">{fmtDay(today)}</span>
        </div>
        <SignOutButton />
      </header>

      <section className="py-16 text-center text-ink-soft">
        <p className="text-ui">
          Scaffold ready. Sections, shared calendar and the Minute Ledger land in
          the next milestones.
        </p>
      </section>
    </div>
  );
}
