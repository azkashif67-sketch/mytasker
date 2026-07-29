"use client";

import { fmtMinute, fmtDuration } from "@/lib/pkt-dates";
import type { BoardRow, ItemStatus } from "@/lib/types";
import { StatusControl } from "@/components/StatusControl";
import { FlagBadges } from "@/components/FlagBadge";

// One item in a section list: status control, time, duration, title, flags.
// Focus a row and use the keyboard map (brief §15): E edit · M move · Space
// cycle status · ⌫ trash. Click opens the editor. Overdue items get a 3px amber
// leading bar (brief §12).

const NEXT: Record<ItemStatus, ItemStatus> = {
  unfinished: "ongoing",
  ongoing: "completed",
  completed: "unfinished",
};

export function ItemRow({
  item,
  onOpen,
  onStatus,
  onMove,
  onTrash,
}: {
  item: BoardRow;
  onOpen: () => void;
  onStatus: (next: ItemStatus) => void;
  onMove: () => void;
  onTrash: () => void;
}) {
  const timeLabel = item.start_minute != null ? fmtMinute(item.start_minute) : "Anytime";

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Enter":
      case "e":
      case "E":
        e.preventDefault();
        onOpen();
        break;
      case " ":
        e.preventDefault();
        onStatus(NEXT[item.status]);
        break;
      case "m":
      case "M":
        e.preventDefault();
        onMove();
        break;
      case "Backspace":
      case "Delete":
        e.preventDefault();
        onTrash();
        break;
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      data-item-id={item.id}
      data-item-title={item.title}
      className="group relative flex min-h-[44px] cursor-pointer items-center gap-3 rounded border border-transparent px-2 py-1.5 hover:border-rule"
      style={item.is_overdue ? { boxShadow: "inset 3px 0 0 var(--overdue)" } : undefined}
      aria-label={`${item.title}, ${timeLabel}${
        item.duration_minutes ? `, ${fmtDuration(item.duration_minutes)}` : ""
      }, ${item.status}${item.is_overdue ? ", overdue" : ""}${
        item.is_overlapped ? `, overlaps ${item.overlaps_with_titles[0] ?? ""}` : ""
      }`}
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
