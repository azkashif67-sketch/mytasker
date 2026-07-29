import type { QueryClient } from "@tanstack/react-query";
import { computeOverlaps, DEFAULT_BUDGET_MINUTES, type OverlapResult } from "@/lib/flags";
import { fmtDay } from "@/lib/pkt-dates";
import type { BoardRow, DailyLoadRow, ItemKind } from "@/lib/types";

// Optimistic cache surgery for the four range-scoped caches (brief §8).
//
// Overlap is computed across BOTH kinds (§6), and only the `calendar` cache
// holds both kinds — so it is the source of truth for flag recomputation. The
// single-kind `board` caches mirror the flags computed there. `daily_load` is
// recomputed from the same merged day items.

const KINDS: ItemKind[] = ["task", "goal"];

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

// -- primitive cache writers ------------------------------------------------

export function eachCalendar(
  qc: QueryClient,
  fn: (rows: BoardRow[]) => BoardRow[],
): void {
  qc.setQueriesData<BoardRow[]>({ queryKey: ["calendar"] }, (rows) =>
    rows ? fn(rows) : rows,
  );
}

export function eachBoard(
  qc: QueryClient,
  kind: ItemKind,
  fn: (rows: BoardRow[]) => BoardRow[],
): void {
  qc.setQueriesData<BoardRow[]>({ queryKey: ["board", kind] }, (rows) =>
    rows ? fn(rows) : rows,
  );
}

/** Merge every cached calendar range into a by-id lookup (last write wins). */
export function findCalendarRow(qc: QueryClient, id: string): BoardRow | undefined {
  for (const [, rows] of qc.getQueriesData<BoardRow[]>({ queryKey: ["calendar"] })) {
    const found = rows?.find((r) => r.id === id);
    if (found) return found;
  }
  return undefined;
}

// -- flag + load recomputation ---------------------------------------------

function reflagRows(rows: BoardRow[], days: Set<string>): BoardRow[] {
  const byDay = new Map<string, BoardRow[]>();
  for (const r of rows) if (days.has(r.day)) push(byDay, r.day, r);

  const flags = new Map<string, OverlapResult>();
  byDay.forEach((items) => {
    computeOverlaps(items).forEach((v, k) => flags.set(k, v));
  });

  return rows.map((r) =>
    days.has(r.day) && flags.has(r.id) ? { ...r, ...flags.get(r.id)! } : r,
  );
}

/**
 * Recompute overlap flags for the given days in the calendar caches, then
 * mirror the results onto the board caches by id. Call after any content change.
 */
export function reflag(qc: QueryClient, days: string[]): void {
  const set = new Set(days);
  eachCalendar(qc, (rows) => reflagRows(rows, set));

  // Pull the freshly-flagged values back out of the calendar caches...
  const flagById = new Map<
    string,
    Pick<BoardRow, "is_overlapped" | "overlaps_with_ids" | "overlaps_with_titles">
  >();
  for (const [, rows] of qc.getQueriesData<BoardRow[]>({ queryKey: ["calendar"] })) {
    for (const r of rows ?? []) {
      if (set.has(r.day)) {
        flagById.set(r.id, {
          is_overlapped: r.is_overlapped,
          overlaps_with_ids: r.overlaps_with_ids,
          overlaps_with_titles: r.overlaps_with_titles,
        });
      }
    }
  }

  // ...and mirror onto the single-kind board caches.
  for (const kind of KINDS) {
    eachBoard(qc, kind, (rows) =>
      rows.map((r) =>
        set.has(r.day) && flagById.has(r.id) ? { ...r, ...flagById.get(r.id)! } : r,
      ),
    );
  }
}

/** Recompute daily_load rows for the given days from the merged calendar items. */
export function recomputeLoad(qc: QueryClient, days: string[]): void {
  const set = new Set(days);

  const itemsByDay = new Map<string, BoardRow[]>();
  for (const [, rows] of qc.getQueriesData<BoardRow[]>({ queryKey: ["calendar"] })) {
    for (const r of rows ?? []) if (set.has(r.day)) push(itemsByDay, r.day, r);
  }

  qc.setQueriesData<DailyLoadRow[]>({ queryKey: ["load"] }, (rows) => {
    if (!rows) return rows;

    const budget = rows[0]?.daily_budget_minutes ?? DEFAULT_BUDGET_MINUTES;
    const userId = rows[0]?.user_id ?? "";
    const byDay = new Map(rows.map((r) => [r.day, r]));

    for (const day of set) {
      const items = itemsByDay.get(day) ?? [];
      const goalMin = sum(items.filter((i) => i.kind === "goal"));
      const taskMin = sum(items.filter((i) => i.kind === "task"));
      const total = goalMin + taskMin;
      const existing = byDay.get(day);

      byDay.set(day, {
        user_id: existing?.user_id ?? userId,
        day,
        day_label: existing?.day_label ?? fmtDay(day),
        minutes_allotted: total,
        goal_minutes: goalMin,
        task_minutes: taskMin,
        daily_budget_minutes: existing?.daily_budget_minutes ?? budget,
        over_budget: total > (existing?.daily_budget_minutes ?? budget),
        unfinished_count: items.filter((i) => i.status === "unfinished").length,
        ongoing_count: items.filter((i) => i.status === "ongoing").length,
        completed_count: items.filter((i) => i.status === "completed").length,
      });
    }

    // Drop rows that fell to zero items on an affected day.
    return [...byDay.values()].filter(
      (r) => !set.has(r.day) || r.minutes_allotted > 0 || (itemsByDay.get(r.day)?.length ?? 0) > 0,
    );
  });
}

function sum(items: Array<{ duration_minutes: number | null }>): number {
  return items.reduce((s, i) => s + (i.duration_minutes ?? 0), 0);
}

/** Recompute both flags and load for the affected days in one call. */
export function resyncDays(qc: QueryClient, days: string[]): void {
  reflag(qc, days);
  recomputeLoad(qc, days);
}

/** Snapshot every affected cache so a failed mutation can roll back (brief §8). */
export function snapshotCaches(qc: QueryClient) {
  return {
    board: qc.getQueriesData<BoardRow[]>({ queryKey: ["board"] }),
    calendar: qc.getQueriesData<BoardRow[]>({ queryKey: ["calendar"] }),
    load: qc.getQueriesData<DailyLoadRow[]>({ queryKey: ["load"] }),
  };
}

export type CacheSnapshot = ReturnType<typeof snapshotCaches>;

export function restoreCaches(qc: QueryClient, snapshot: CacheSnapshot): void {
  for (const [key, data] of snapshot.board) qc.setQueryData(key, data);
  for (const [key, data] of snapshot.calendar) qc.setQueryData(key, data);
  for (const [key, data] of snapshot.load) qc.setQueryData(key, data);
}

/** Invalidate all four range-scoped keys after a mutation settles (brief §8). */
export async function invalidateAll(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ["board"] }),
    qc.invalidateQueries({ queryKey: ["calendar"] }),
    qc.invalidateQueries({ queryKey: ["load"] }),
  ]);
}
