// ---------------------------------------------------------------------
// All dates in this app are PKT calendar dates, stored as 'YYYY-MM-DD'.
// Never build one with `new Date()` and local getters — that silently
// shifts the day whenever the runtime timezone isn't Asia/Karachi
// (Vercel builds and edge functions run in UTC).
// ---------------------------------------------------------------------

const TZ = "Asia/Karachi";

/** Today in PKT as 'YYYY-MM-DD'. en-CA formats as ISO. */
export function todayPKT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Shift a 'YYYY-MM-DD' by n days without ever touching local time. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/** '2026-07-27' -> 'Monday, 27th July, 2026'  (mirrors public.fmt_day) */
export function fmtDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const opts = { timeZone: "UTC" } as const;
  const weekday = t.toLocaleDateString("en-GB", { weekday: "long", ...opts });
  const month = t.toLocaleDateString("en-GB", { month: "long", ...opts });
  return `${weekday}, ${d}${ordinal(d)} ${month}, ${y}`;
}

/** 615 -> '10:15'.  Minute-of-day is the only time unit stored. */
export function fmtMinute(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** 35 -> '35m', 95 -> '1h 35m' */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
