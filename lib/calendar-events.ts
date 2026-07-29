import { fmtMinute, addDays } from "@/lib/pkt-dates";
import type { BoardRow } from "@/lib/types";

// Mapping between our BoardRow model and FullCalendar events. FullCalendar is
// configured with timeZone 'Asia/Karachi' and is only ever handed plain date
// strings — never Date objects (brief §7).

export interface CalEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  classNames: string[];
  extendedProps: { kind: BoardRow["kind"] };
}

const KIND_COLOR: Record<BoardRow["kind"], string> = {
  task: "#2E4E6E", // --task
  goal: "#2F5D50", // --goal
};

/** Minute-of-day 600 -> 'T10:00:00'. */
function timeSuffix(min: number): string {
  return `T${fmtMinute(min)}:00`;
}

export function eventFromRow(row: BoardRow): CalEvent {
  const color = KIND_COLOR[row.kind];
  const classNames: string[] = [];
  if (row.is_overlapped) classNames.push("fc-overlap");
  if (row.is_overdue) classNames.push("fc-overdue");

  const base = {
    id: row.id,
    title: row.title,
    backgroundColor: color,
    borderColor: color,
    textColor: "#F4F6F2",
    classNames,
    extendedProps: { kind: row.kind },
  };

  if (row.start_minute != null && row.duration_minutes != null) {
    const endMin = row.start_minute + row.duration_minutes;
    const end =
      endMin >= 1440
        ? `${addDays(row.day, 1)}T00:00:00`
        : `${row.day}${timeSuffix(endMin)}`;
    return { ...base, start: `${row.day}${timeSuffix(row.start_minute)}`, end, allDay: false };
  }

  // Unscheduled: belongs to a day but not an hour — the "Anytime" strip (§6).
  return { ...base, start: row.day, allDay: true };
}

/** Minute-of-day (0–1439) for an instant, read in Pakistan time (brief §7). */
export function minuteOfDayPKT(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return (h % 24) * 60 + m;
}

/** Pakistan calendar date 'YYYY-MM-DD' for an instant (brief §7). */
export function dayStringPKT(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);
}
