import { describe, it, expect } from "vitest";
import { parseClock, parseMinutes, validateDraft, orderForSection } from "@/lib/item-input";
import type { BoardRow } from "@/lib/types";

describe("parseClock", () => {
  it("parses times and blanks", () => {
    expect(parseClock("10:00")).toBe(600);
    expect(parseClock("10")).toBe(600);
    expect(parseClock("9:05")).toBe(545);
    expect(parseClock("")).toBeNull();
    expect(Number.isNaN(parseClock("25:00") as number)).toBe(true);
    expect(Number.isNaN(parseClock("abc") as number)).toBe(true);
  });
});

describe("parseMinutes", () => {
  it("parses integers and blanks", () => {
    expect(parseMinutes("35")).toBe(35);
    expect(parseMinutes("")).toBeNull();
    expect(Number.isNaN(parseMinutes("3.5") as number)).toBe(true);
  });
});

describe("validateDraft (brief §5/§18)", () => {
  it("a goal without a duration is an error", () => {
    const e = validateDraft("goal", { title: "Arabic", start_minute: null, duration_minutes: null });
    expect(e.duration_minutes).toBeTruthy();
  });

  it("a task without a duration is fine", () => {
    const e = validateDraft("task", { title: "Groceries", start_minute: null, duration_minutes: null });
    expect(e.duration_minutes).toBeUndefined();
  });

  it("a block from 23:50 lasting 60 min is rejected (crosses midnight)", () => {
    const e = validateDraft("goal", { title: "x", start_minute: 1430, duration_minutes: 60 });
    expect(e.duration_minutes).toBeTruthy();
  });

  it("empty title is an error", () => {
    expect(validateDraft("task", { title: "   ", start_minute: null, duration_minutes: null }).title).toBeTruthy();
  });

  it("a valid goal passes", () => {
    expect(validateDraft("goal", { title: "Study", start_minute: 600, duration_minutes: 35 })).toEqual({});
  });
});

describe("orderForSection (brief §6)", () => {
  const row = (id: string, start: number | null, created: string): BoardRow =>
    ({
      id,
      start_minute: start,
      created_at: created,
    }) as BoardRow;

  it("scheduled by start_minute, then unscheduled by created_at", () => {
    const items = [
      row("late", 660, "2026-07-01T00:00:00Z"),
      row("unsched-b", null, "2026-07-02T00:00:00Z"),
      row("early", 540, "2026-07-01T00:00:00Z"),
      row("unsched-a", null, "2026-07-01T00:00:00Z"),
    ];
    expect(orderForSection(items).map((i) => i.id)).toEqual(["early", "late", "unsched-a", "unsched-b"]);
  });
});
