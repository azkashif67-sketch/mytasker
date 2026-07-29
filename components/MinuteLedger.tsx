"use client";

import { buildLedger } from "@/lib/ledger";
import { DEFAULT_BUDGET_MINUTES } from "@/lib/flags";
import type { BoardRow } from "@/lib/types";

// The signature component (brief §13): one idea at three scales. A horizontal
// track representing the 300-minute budget, filled with the day's items as
// proportional segments in their kind colours, in chronological order, with the
// unallotted remainder left empty. Overflow past 300 continues past the track's
// end in --conflict, visibly breaking its bounds. Built once, `size` drives the
// rest.

type Size = "strip" | "bar" | "inline";

const HEIGHT: Record<Size, string> = {
  strip: "h-[3px]",
  bar: "h-2",
  inline: "h-6",
};

const KIND_BG: Record<BoardRow["kind"], string> = {
  task: "bg-task",
  goal: "bg-goal",
};

export function MinuteLedger({
  items,
  size,
  budget = DEFAULT_BUDGET_MINUTES,
}: {
  items: BoardRow[];
  size: Size;
  budget?: number;
}) {
  const ledger = buildLedger(items, budget);
  const interactive = size === "inline";

  const track = (
    <div
      className={`relative w-full ${HEIGHT[size]} overflow-visible whitespace-nowrap bg-ground ring-1 ring-rule`}
      style={{ fontSize: 0 }}
      role="img"
      aria-label={`${ledger.total} of ${budget} minutes allotted${ledger.overBudget ? ", over budget" : ""}`}
    >
      {ledger.segments.map((seg) => (
        <span key={seg.id} className="inline-block h-full align-top" style={{ width: `${seg.withinPct + seg.overPct}%` }}>
          {seg.withinPct > 0 && (
            <span
              className={`inline-block h-full align-top ${KIND_BG[seg.kind]}`}
              style={{ width: `${(seg.withinPct / (seg.withinPct + seg.overPct)) * 100}%` }}
              title={interactive ? `${seg.title} · ${seg.minutes}m` : undefined}
            />
          )}
          {seg.overPct > 0 && (
            <span
              className="inline-block h-full align-top bg-conflict"
              style={{ width: `${(seg.overPct / (seg.withinPct + seg.overPct)) * 100}%` }}
              title={interactive ? `${seg.title} · ${seg.minutes}m (over budget)` : undefined}
            />
          )}
        </span>
      ))}
    </div>
  );

  if (size === "strip") return track;

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{track}</div>
      <span className={`tabular shrink-0 text-data ${ledger.overBudget ? "text-conflict" : "text-ink-soft"}`}>
        {ledger.total} / {budget} min
      </span>
    </div>
  );
}
