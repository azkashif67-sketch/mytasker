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
