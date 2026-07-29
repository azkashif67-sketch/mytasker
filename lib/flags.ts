import type { BoardRow, ItemStatus } from "@/lib/types";

// Client-side recomputation of the three advisory flags (brief §8, §12).
// These mirror the server-derived flags so an optimistic row can show a fresh
// value instantly; the server value replaces it on refetch. If the two ever
// disagree, the client rule here is wrong and must be fixed to match (§8).
//
// Pure and framework-free so it is trivially unit-testable.

export const DEFAULT_BUDGET_MINUTES = 300;

/** The minimum an item needs for a time block: a start and a duration. */
export interface Blockish {
  id: string;
  start_minute: number | null;
  duration_minutes: number | null;
  title: string;
}

/**
 * Two items overlap when both have a start and a duration and their half-open
 * minute ranges [start, start+duration) intersect (brief §8). Touching ranges
 * (one ends exactly where the next begins) do NOT overlap.
 */
export function overlaps(a: Blockish, b: Blockish): boolean {
  if (
    a.start_minute == null ||
    a.duration_minutes == null ||
    b.start_minute == null ||
    b.duration_minutes == null
  ) {
    return false;
  }
  const aEnd = a.start_minute + a.duration_minutes;
  const bEnd = b.start_minute + b.duration_minutes;
  return a.start_minute < bEnd && b.start_minute < aEnd;
}

export interface OverlapResult {
  is_overlapped: boolean;
  overlaps_with_ids: string[];
  overlaps_with_titles: string[];
}

/**
 * For a single day's items (across both kinds), compute each item's overlap
 * flag and the ids/titles it conflicts with, ordered by start_minute to match
 * the server view's `array_agg(... order by start_minute)`.
 */
export function computeOverlaps(dayItems: Blockish[]): Map<string, OverlapResult> {
  const result = new Map<string, OverlapResult>();

  for (const item of dayItems) {
    const others = dayItems
      .filter((o) => o.id !== item.id && overlaps(item, o))
      .sort((a, b) => (a.start_minute ?? 0) - (b.start_minute ?? 0));

    result.set(item.id, {
      is_overlapped: others.length > 0,
      overlaps_with_ids: others.map((o) => o.id),
      overlaps_with_titles: others.map((o) => o.title),
    });
  }

  return result;
}

/** Unfinished (or ongoing) and the day has already passed (brief §12). */
export function isOverdue(
  item: { status: ItemStatus; day: string },
  todayPkt: string,
): boolean {
  return item.status !== "completed" && item.day < todayPkt;
}

/** Total planned minutes for a set of items (both kinds count; brief §6). */
export function dayMinutes(items: Array<{ duration_minutes: number | null }>): number {
  return items.reduce((sum, i) => sum + (i.duration_minutes ?? 0), 0);
}

/** The day is over budget when its minute sum exceeds the budget (brief §12). */
export function overBudget(
  items: Array<{ duration_minutes: number | null }>,
  budget: number = DEFAULT_BUDGET_MINUTES,
): boolean {
  return dayMinutes(items) > budget;
}

/**
 * Apply freshly-computed overlap flags onto board rows for one day. Used by the
 * optimistic mutation path to keep flags live before the server responds.
 */
export function applyOverlapFlags(dayRows: BoardRow[]): BoardRow[] {
  const overlapById = computeOverlaps(dayRows);
  return dayRows.map((row) => {
    const o = overlapById.get(row.id);
    return o ? { ...row, ...o } : row;
  });
}
