# Minute

A single-user daily task &amp; learning planner. Tasks and learning goals live in
two sections with their own controls and appear together on one shared calendar,
measured against a 300-minute daily budget. Built to be fast to type into and
clear to read at a glance — a drafting instrument for a day's minutes, not a
productivity app.

> Built from a fixed brief. The governing principle: **the system never blocks,
> it flags.** Overlaps, over-budget days and overdue items are all legal states,
> surfaced loudly and rescheduled by the owner — never by the app.

## Stack

- **Next.js 15** (App Router, TypeScript strict) on **Vercel Hobby**
- **Supabase** (Postgres, RLS, realtime) — email + password auth, single user
- **TanStack Query v5** — optimistic updates with rollback
- **FullCalendar 6** (daygrid / timegrid / interaction)
- **Tailwind** with tokens from the brief §13; **Lucide** icons

## Status — milestone checkpoints

- [x] **M0 — Infrastructure &amp; scaffold** (this commit): Next.js app, Tailwind
      tokens, Supabase clients + middleware auth guard, email/password login,
      `supabase/schema.sql` and `lib/pkt-dates.ts` copied verbatim from the brief,
      placeholder generated types, date-library tests.
- [ ] M1 — Data layer (queries, optimistic mutations, realtime)
- [ ] M2 — Sections (both panes: composer, list, status, edit sheet, undo)
- [ ] M3 — Calendar (month/week/day, four move routes)
- [ ] M4 — Minute Ledger &amp; flags
- [ ] M5 — Polish (tokens, keyboard, a11y, PWA)
- [ ] M6 — Ship (domain, backups, acceptance list)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in from your Supabase project
npm run dev                  # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Supabase setup (owner)

1. Create a Supabase project (free tier).
2. Paste the entire `supabase/schema.sql` into the SQL editor and run it once.
   **Do not modify it** — the app depends on its views and RPCs exactly as given.
3. **Auth → turn off public sign-ups.** Then **create the single user with an
   email and password** (Authentication → Users → Add user). Email + password
   is the only sign-in method; there is no sign-up screen.
4. Copy the project URL and the **publishable / anon** public key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Never use the
   service-role / secret key in this app.
5. Set **Auth → URL Configuration → Site URL** and add your deploy URL to the
   redirect allow-list.
6. Regenerate types whenever the schema changes: `npm run gen:types`.

## Dates &amp; time

Every date is a **Pakistan calendar date** stored as `'YYYY-MM-DD'` — a label,
never an instant. All date handling goes through `lib/pkt-dates.ts`, which mirrors
the server's `public.fmt_day()`. Never use `new Date()` with local getters.

## Out of scope for v1 (v2 list)

Recurring goals · time tracking or timers · tags and projects · search ·
notifications · sharing or multi-user · calendar import/export · analytics
dashboards · offline writes · drag-reordering within a list.

## License

Private, single-user project.
