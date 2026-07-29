import { orderForSection } from "@/lib/item-input";
import { DEFAULT_BUDGET_MINUTES } from "@/lib/flags";
import type { BoardRow, ItemKind } from "@/lib/types";

// The Minute Ledger's data model (brief §13). The 300-minute budget is a track;
// the day's items fill it as proportional segments in chronological order. The
// portion of any item beyond the budget is "overflow" and renders in --conflict,
// visibly breaking past the track's end.

export interface LedgerSegment {
  id: string;
  title: string;
  kind: ItemKind;
  minutes: number;
  /** Percent of the budget the in-budget part occupies. */
  withinPct: number;
  /** Percent of the budget the over-budget part occupies (0 unless it spills). */
  overPct: number;
}

export interface Ledger {
  segments: LedgerSegment[];
  total: number;
  budget: number;
  overBudget: boolean;
  /** Fraction of the budget still unallotted, 0–100 (0 once over budget). */
  freePct: number;
}

export function buildLedger(items: BoardRow[], budget: number = DEFAULT_BUDGET_MINUTES): Ledger {
  const ordered = orderForSection(items).filter((i) => (i.duration_minutes ?? 0) > 0);

  let cum = 0;
  const segments: LedgerSegment[] = ordered.map((it) => {
    const minutes = it.duration_minutes as number;
    const within = Math.max(0, Math.min(minutes, budget - cum));
    const over = minutes - within;
    cum += minutes;
    return {
      id: it.id,
      title: it.title,
      kind: it.kind,
      minutes,
      withinPct: (within / budget) * 100,
      overPct: (over / budget) * 100,
    };
  });

  return {
    segments,
    total: cum,
    budget,
    overBudget: cum > budget,
    freePct: Math.max(0, ((budget - cum) / budget) * 100),
  };
}
