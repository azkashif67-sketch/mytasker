import type { BoardRow, ItemKind } from "@/lib/types";

// Parsing + validation for the composer and editor. Validation mirrors the DB
// hard rules (brief §5) so the owner sees an inline field error rather than a
// thrown constraint / toast.

/** '10:00' | '10' -> minute-of-day; '' -> null; invalid -> NaN. */
export function parseClock(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):?(\d{2})?$/);
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return NaN;
  return h * 60 + min;
}

/** '35' -> 35; '' -> null; invalid -> NaN. */
export function parseMinutes(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return NaN;
  return Number(s);
}

export type ItemField = "title" | "start_minute" | "duration_minutes";
export type FieldErrors = Partial<Record<ItemField, string>>;

export interface DraftValues {
  title: string;
  start_minute: number | null; // NaN signals a parse error
  duration_minutes: number | null; // NaN signals a parse error
}

/** Validate a draft against the DB constraints (brief §5). */
export function validateDraft(kind: ItemKind, d: DraftValues): FieldErrors {
  const errors: FieldErrors = {};

  const title = d.title.trim();
  if (title.length < 1) errors.title = "Give it a title.";
  else if (title.length > 200) errors.title = "Keep the title under 200 characters.";

  if (Number.isNaN(d.start_minute)) {
    errors.start_minute = "Use a time like 10:00.";
  } else if (d.start_minute != null && (d.start_minute < 0 || d.start_minute > 1439)) {
    errors.start_minute = "Time must be within the day.";
  }

  if (Number.isNaN(d.duration_minutes)) {
    errors.duration_minutes = "Minutes must be a number.";
  } else if (kind === "goal" && d.duration_minutes == null) {
    errors.duration_minutes = "A study block needs a duration.";
  } else if (d.duration_minutes != null && (d.duration_minutes < 1 || d.duration_minutes > 1440)) {
    errors.duration_minutes = "Duration must be 1–1440 minutes.";
  }

  // No block may cross midnight (brief §5).
  if (
    !errors.start_minute &&
    !errors.duration_minutes &&
    d.start_minute != null &&
    d.duration_minutes != null &&
    d.start_minute + d.duration_minutes > 1440
  ) {
    errors.duration_minutes = "This runs past midnight.";
  }

  return errors;
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.keys(e).length > 0;
}

/**
 * Section ordering (brief §6): scheduled items by start_minute ascending, then
 * unscheduled items by created_at.
 */
export function orderForSection(items: BoardRow[]): BoardRow[] {
  const scheduled = items
    .filter((i) => i.start_minute != null)
    .sort((a, b) => (a.start_minute ?? 0) - (b.start_minute ?? 0));
  const unscheduled = items
    .filter((i) => i.start_minute == null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return [...scheduled, ...unscheduled];
}
