# Decisions

Judgement calls made where the brief left them open (per its instruction in §"The
prompt"). One line each; newest at the bottom.

## M0 — Infrastructure & scaffold

- **Auth token verification route.** The brief mandates magic-link auth but not
  the landing route. Chose Supabase's `token_hash` + `verifyOtp` flow at
  `/auth/confirm`, redirecting to `/` on success and `/login?error=link` on
  failure. Login uses `shouldCreateUser: false` so the link never self-provisions
  an account (sign-ups are also off in the dashboard).
- **Route grouping.** `/login` lives in the `(auth)` group and `/auth/confirm` is
  a plain route handler (not guarded); everything else is under `(app)` and
  guarded by both the middleware and the `(app)` layout's `getUser()` check.
- **Generated types.** No Supabase project exists yet, so `lib/types.ts` is a
  hand-written `Database` type mirroring Appendix A. It is replaced by
  `npm run gen:types` output once a project ref is available.
- **Tailwind + CSS variables both carry the palette.** Tokens live in
  `tailwind.config.ts` for utility classes and are mirrored as `:root` CSS
  variables in `globals.css` so non-Tailwind surfaces (FullCalendar, the ledger
  SVG) can read the same nine values.
- **PWA manifest is a stub in M0.** Real maskable icons and the service worker
  land in M5; a minimal `manifest.webmanifest` exists now so the metadata link
  resolves.
- **Testing.** Vitest (node env) for pure logic; `lib/pkt-dates.test.ts` locks the
  date invariants from §7/§18 early since they are the brief's stated top bug
  risk.
