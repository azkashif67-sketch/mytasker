# Decisions

Judgement calls made where the brief left them open (per its instruction in §"The
prompt"). One line each; newest at the bottom.

## M0 — Infrastructure & scaffold

- **Auth method — password, not magic link (owner override).** The brief
  specified email magic-link auth; the owner asked for **email + password**
  sign-in instead. Login now uses `signInWithPassword` on `/login`. There is
  still no sign-up screen — the single account is created from the Supabase
  dashboard with public sign-ups off. The magic-link `/auth/confirm` route was
  removed.
- **Route grouping.** `/login` lives in the `(auth)` group; everything else is
  under `(app)` and guarded by both the middleware and the `(app)` layout's
  `getUser()` check.
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

## M4 — Minute Ledger & flags

- **Ledger "gaps for unallotted time" = the empty remainder.** The brief's
  phrase is read as: items pack left-to-right in chronological order as
  proportional segments, and whatever budget is left over (300 − total) shows as
  empty track — i.e. the gap is the unspent budget, not gaps positioned by clock
  time. This matches the brief's framing ("how much of it is already spoken
  for"). Over-budget overflow spills past the track's right edge in `--conflict`.
- **One `MinuteLedger`, `size` prop** (`strip`/`bar`/`inline`) built on the pure
  `buildLedger()` in `lib/ledger.ts`. Month cells render the `strip` via
  FullCalendar `dayCellContent`.
- **The 300-minute budget is a single shared total across both kinds** (brief
  §6), so there is exactly one budget `bar` — the combined whole-day status bar
  under the header (plus the hoverable `inline` in day view). Section-pane
  headers show only their own minute subtotal as plain text (e.g. `35m`), never a
  `/300` bar, to avoid implying a per-section budget.

## M5 — Polish

- **PWA icon is a maskable SVG**, not raster PNGs. This container can't run an
  image toolchain, and an SVG with `purpose: "any maskable"` satisfies the
  manifest and installability on Chromium/Android. A raster `apple-touch-icon`
  PNG set is a small follow-up for the best iOS home-screen result.
- **Service worker is app-shell only** (`public/sw.js`): navigations are
  network-first with a cached `/` fallback; `/_next/static` + icons are
  cache-first; cross-origin (Supabase) always hits the network. No offline
  writes in v1 — the composers disable and a persistent offline strip shows
  (brief §16).
- **Keyboard move** (`M`) opens a small date-picker popover (`MovePopover`) as
  the DnD equivalent (brief §15); row-scoped keys (`E`/`M`/`Space`/`⌫`) live on
  `ItemRow`, global keys (`T`/`G`/`[`/`]`/`1`/`2`/`3`/`⌘Z`) on the Planner.
- **Mobile = 3-tab** (Tasks · Calendar · Learning) below `lg`; the three desktop
  columns become one visible panel driven by the bottom tab bar, and tapping
  Calendar defaults to Day view. Desktop keeps the three-column layout.
- **Live region** (`Announcer`) announces status changes, moves, deletes and
  restores for screen readers (brief §15).
