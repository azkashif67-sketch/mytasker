"use client";

import { Clock, Layers } from "lucide-react";
import type { BoardRow } from "@/lib/types";

// Flag indicators (brief §12). Never colour alone — each badge carries an icon
// and names the conflict. Hue means *what it is* (kind); badges mean *what's
// wrong*. Overdue and overlapped can both appear.

export function FlagBadges({ item }: { item: BoardRow }) {
  const overlapTitle = item.overlaps_with_titles[0];
  const more = item.overlaps_with_titles.length - 1;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {item.is_overdue && (
        <span
          className="inline-flex items-center gap-1 rounded border border-overdue px-1.5 py-0.5 text-[11px] text-overdue"
          role="status"
        >
          <Clock size={11} aria-hidden />
          Overdue
        </span>
      )}
      {item.is_overlapped && overlapTitle && (
        <span
          className="inline-flex items-center gap-1 rounded border border-conflict px-1.5 py-0.5 text-[11px] text-conflict"
          role="status"
        >
          <Layers size={11} aria-hidden />
          Overlaps {overlapTitle}
          {more > 0 ? ` +${more}` : ""}
        </span>
      )}
    </span>
  );
}
