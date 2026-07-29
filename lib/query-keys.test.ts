import { describe, it, expect } from "vitest";
import { rangeFor, rangeCovers, queryKeys } from "@/lib/query-keys";

describe("rangeFor", () => {
  it("day view is the single day padded ±1 week", () => {
    // 2026-07-29 is a Wednesday
    expect(rangeFor("2026-07-29", "day")).toEqual({
      start: "2026-07-22",
      end: "2026-08-05",
    });
  });

  it("week view starts on Monday, padded ±1 week", () => {
    // Week of Wed 2026-07-29 -> Mon 2026-07-27..Sun 2026-08-02, then ±7
    expect(rangeFor("2026-07-29", "week")).toEqual({
      start: "2026-07-20",
      end: "2026-08-09",
    });
  });

  it("month view covers the month padded ±1 week", () => {
    expect(rangeFor("2026-07-15", "month")).toEqual({
      start: "2026-06-24",
      end: "2026-08-07",
    });
  });
});

describe("rangeCovers", () => {
  const range = { start: "2026-07-20", end: "2026-08-09" };
  it("includes the endpoints and excludes outside", () => {
    expect(rangeCovers(range, "2026-07-20")).toBe(true);
    expect(rangeCovers(range, "2026-08-09")).toBe(true);
    expect(rangeCovers(range, "2026-07-19")).toBe(false);
    expect(rangeCovers(range, "2026-08-10")).toBe(false);
  });
});

describe("queryKeys", () => {
  const range = { start: "2026-07-20", end: "2026-08-09" };
  it("matches the brief §8 shapes", () => {
    expect(queryKeys.board("task", range)).toEqual(["board", "task", "2026-07-20", "2026-08-09"]);
    expect(queryKeys.calendar(range)).toEqual(["calendar", "2026-07-20", "2026-08-09"]);
    expect(queryKeys.load(range)).toEqual(["load", "2026-07-20", "2026-08-09"]);
  });
});
