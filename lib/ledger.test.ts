import { describe, it, expect } from "vitest";
import { buildLedger } from "@/lib/ledger";
import type { BoardRow } from "@/lib/types";

const row = (id: string, kind: "task" | "goal", start: number | null, dur: number | null): BoardRow =>
  ({ id, kind, title: id, start_minute: start, duration_minutes: dur, created_at: "2026-07-01T00:00:00Z" }) as BoardRow;

describe("buildLedger (brief §13)", () => {
  it("packs segments chronologically and tracks free budget", () => {
    const l = buildLedger([row("b", "task", 600, 30), row("a", "goal", 540, 35)]);
    expect(l.segments.map((s) => s.id)).toEqual(["a", "b"]); // ordered by start_minute
    expect(l.total).toBe(65);
    expect(l.overBudget).toBe(false);
    expect(Math.round(l.freePct)).toBe(Math.round(((300 - 65) / 300) * 100));
  });

  it("splits the boundary item into within + overflow parts", () => {
    // 280 then 40 -> last item: 20 within, 20 over (budget 300)
    const l = buildLedger([row("a", "task", 0, 280), row("b", "goal", 300, 40)]);
    const b = l.segments.find((s) => s.id === "b")!;
    expect(Math.round((b.withinPct / 100) * 300)).toBe(20);
    expect(Math.round((b.overPct / 100) * 300)).toBe(20);
    expect(l.overBudget).toBe(true);
    expect(l.freePct).toBe(0);
  });

  it("marks 320 minutes over budget (§18)", () => {
    expect(buildLedger([row("a", "task", 0, 320)]).overBudget).toBe(true);
  });

  it("ignores items without a duration", () => {
    expect(buildLedger([row("a", "task", null, null)]).segments).toHaveLength(0);
  });
});
