import { describe, it, expect } from "vitest";
import { todayPKT, addDays, fmtDay, fmtMinute, fmtDuration } from "@/lib/pkt-dates";

// The brief §7/§18 call these out as the single most likely source of bugs.
// These assert the invariants that must hold regardless of runtime timezone.

describe("fmtDay", () => {
  it("renders the long PKT form", () => {
    expect(fmtDay("2026-07-27")).toBe("Monday, 27th July, 2026");
  });

  it("applies correct ordinals", () => {
    expect(fmtDay("2026-07-01")).toContain("1st");
    expect(fmtDay("2026-07-02")).toContain("2nd");
    expect(fmtDay("2026-07-03")).toContain("3rd");
    expect(fmtDay("2026-07-11")).toContain("11th");
    expect(fmtDay("2026-07-21")).toContain("21st");
  });
});

describe("addDays", () => {
  it("crosses month boundaries without touching local time", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("fmtMinute", () => {
  it("formats minute-of-day as HH:MM", () => {
    expect(fmtMinute(600)).toBe("10:00");
    expect(fmtMinute(615)).toBe("10:15");
    expect(fmtMinute(0)).toBe("00:00");
    expect(fmtMinute(1439)).toBe("23:59");
  });
});

describe("fmtDuration", () => {
  it("formats minutes and hours", () => {
    expect(fmtDuration(35)).toBe("35m");
    expect(fmtDuration(95)).toBe("1h 35m");
    expect(fmtDuration(120)).toBe("2h");
  });
});

describe("todayPKT", () => {
  it("returns an ISO calendar date string", () => {
    expect(todayPKT()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
