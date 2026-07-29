import { addDays } from "@/lib/pkt-dates";
import type { ItemKind } from "@/lib/types";

// Range-scoped query keys (brief §8) so a change to one day doesn't refetch a
// year. A "range" is the visible calendar period padded by one week either side;
// the section panes read from the same cached range.

export type DateRange = { start: string; end: string }; // inclusive 'YYYY-MM-DD'
export type CalendarView = "month" | "week" | "day";

export const queryKeys = {
  board: (kind: ItemKind, range: DateRange) =>
    ["board", kind, range.start, range.end] as const,
  calendar: (range: DateRange) =>
    ["calendar", range.start, range.end] as const,
  load: (range: DateRange) => ["load", range.start, range.end] as const,
};

/**
 * The visible period for a view anchored on `anchorDay`, padded by ±1 week.
 * Week starts on Monday (brief §7). Dates never touch local time — all math is
 * on 'YYYY-MM-DD' strings via addDays.
 */
export function rangeFor(anchorDay: string, view: CalendarView): DateRange {
  let start: string;
  let end: string;

  if (view === "day") {
    start = anchorDay;
    end = anchorDay;
  } else if (view === "week") {
    const mondayOffset = mondayOffsetOf(anchorDay);
    start = addDays(anchorDay, -mondayOffset);
    end = addDays(start, 6);
  } else {
    // month: cover the whole month grid generously; the ±1 week pad below
    // absorbs the leading/trailing days FullCalendar shows from adjacent months.
    const [y, m] = anchorDay.split("-").map(Number);
    start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  // Pad by a week on each side.
  return { start: addDays(start, -7), end: addDays(end, 7) };
}

/** 0 = Monday … 6 = Sunday, computed without local time. */
function mondayOffsetOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  const jsDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDow + 6) % 7;
}

/** True when `day` falls inside the inclusive range. */
export function rangeCovers(range: DateRange, day: string): boolean {
  return day >= range.start && day <= range.end;
}

/** Move the focused day by one period in the given view (brief §11, `[` `]`). */
export function shiftPeriod(day: string, view: CalendarView, dir: -1 | 1): string {
  if (view === "day") return addDays(day, dir);
  if (view === "week") return addDays(day, dir * 7);
  // month: step whole months, clamping the day-of-month.
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + dir, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const cd = Math.min(d, lastDay);
  return `${ty}-${String(tm).padStart(2, "0")}-${String(cd).padStart(2, "0")}`;
}
