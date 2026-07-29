"use client";

import { fmtMinute, fmtDuration } from "@/lib/pkt-dates";
import type { BoardRow, ItemStatus } from "@/lib/types";
import { StatusControl } from "@/components/StatusControl";
import { FlagBadges } from "@/components/FlagBadge";

// One item in a section list: status control, time, duration, title, flags.
// Clicking the row (not the status control) opens the editor. Overdue items get
// a 3px amber bar down the leading edge (brief §12).

export function ItemRow({
  item,
  onOpen,
  onStatus,
}: {
  item: BoardRow;
  onOpen: () => void;
  onStatus: (next: ItemStatus) => void;
}) {
  const timeLabel = item.start_minute != null ? fmtMinute(item.start_minute) : "Anytime";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="group relative flex min-h-[44px] cursor-pointer items-center gap-3 rounded border border-transparent px-2 py-1.5 hover:border-rule"
      style={item.is_overdue ? { boxShadow: "inset 3px 0 0 var(--overdue)" } : undefined}
      aria-label={`${item.title}, ${timeLabel}${
        item.duration_minutes ? `, ${fmtDuration(item.duration_minutes)}` : ""
      }, ${item.status}${item.is_overlapped ? `, overlaps ${item.overlaps_with_titles[0] ?? ""}` : ""}`}
    >
      <StatusControl status={item.status} onChange={onStatus} />

      <span className="tabular w-16 shrink-0 text-data text-ink-soft">{timeLabel}</span>
      <span className="tabular w-12 shrink-0 text-data text-ink-soft">
        {item.duration_minutes != null ? fmtDuration(item.duration_minutes) : ""}
      </span>

      <span
        className={`min-w-0 flex-1 truncate text-ui ${
          item.status === "completed" ? "text-ink-soft line-through" : "text-ink"
        }`}
      >
        {item.title}
      </span>

      <FlagBadges item={item} />
    </div>
  );
}
