import { describe, it, expect } from "vitest";
import {
  overlaps,
  computeOverlaps,
  isOverdue,
  dayMinutes,
  overBudget,
  type Blockish,
} from "@/lib/flags";

const block = (id: string, start: number | null, dur: number | null, title = id): Blockish => ({
  id,
  start_minute: start,
  duration_minutes: dur,
  title,
});

describe("overlaps", () => {
  it("flags intersecting half-open ranges (§18)", () => {
    // 10:00-10:35 vs 10:20-11:00
    expect(overlaps(block("a", 600, 35), block("b", 620, 40))).toBe(true);
  });

  it("does not flag touching ranges", () => {
    // 10:00-10:30 ends exactly where 10:30-11:00 begins
    expect(overlaps(block("a", 600, 30), block("b", 630, 30))).toBe(false);
  });

  it("does not flag unscheduled items (missing start or duration)", () => {
    expect(overlaps(block("a", null, 30), block("b", 600, 30))).toBe(false);
    expect(overlaps(block("a", 600, null), block("b", 600, 30))).toBe(false);
  });
});

describe("computeOverlaps", () => {
  it("names the conflicting item, both directions", () => {
    const items = [block("a", 600, 35, "Implementation of generative AI"), block("b", 620, 40, "Arabic vocabulary")];
    const map = computeOverlaps(items);
    expect(map.get("a")!.is_overlapped).toBe(true);
    expect(map.get("a")!.overlaps_with_titles).toEqual(["Arabic vocabulary"]);
    expect(map.get("b")!.overlaps_with_titles).toEqual(["Implementation of generative AI"]);
  });

  it("flags cross-kind overlap (task vs goal are just blocks here)", () => {
    // a task at 14:00-15:00 and a goal at 14:30-15:00 (§18)
    const items = [block("task", 840, 60), block("goal", 870, 30)];
    const map = computeOverlaps(items);
    expect(map.get("task")!.is_overlapped).toBe(true);
    expect(map.get("goal")!.is_overlapped).toBe(true);
  });

  it("orders conflicts by start_minute", () => {
    const items = [block("mid", 600, 120), block("early", 540, 120), block("late", 660, 120)];
    const map = computeOverlaps(items);
    expect(map.get("mid")!.overlaps_with_ids).toEqual(["early", "late"]);
  });

  it("clears the flag when nothing overlaps", () => {
    const items = [block("a", 600, 30), block("b", 700, 30)];
    expect(computeOverlaps(items).get("a")!.is_overlapped).toBe(false);
  });
});

describe("isOverdue", () => {
  const today = "2026-07-29";
  it("flags an unfinished item dated before today", () => {
    expect(isOverdue({ status: "unfinished", day: "2026-07-28" }, today)).toBe(true);
    expect(isOverdue({ status: "ongoing", day: "2026-07-28" }, today)).toBe(true);
  });
  it("does not flag today or completed items", () => {
    expect(isOverdue({ status: "unfinished", day: today }, today)).toBe(false);
    expect(isOverdue({ status: "completed", day: "2026-07-28" }, today)).toBe(false);
  });
});

describe("budget", () => {
  it("sums minutes across items", () => {
    expect(dayMinutes([{ duration_minutes: 35 }, { duration_minutes: 30 }, { duration_minutes: null }])).toBe(65);
  });
  it("is over budget above 300, not at 300 (§18)", () => {
    expect(overBudget([{ duration_minutes: 320 }])).toBe(true);
    expect(overBudget([{ duration_minutes: 300 }])).toBe(false);
  });
});
