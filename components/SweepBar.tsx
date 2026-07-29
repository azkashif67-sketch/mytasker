"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { fmtMinute } from "@/lib/pkt-dates";
import { useMoveItems } from "@/lib/mutations";
import type { BoardRow } from "@/lib/types";

// The one bulk operation (brief §11). Appears only when overdue items exist:
// a multi-select over them plus a date picker, firing move_items.

export function SweepBar({ overdue, defaultDay }: { overdue: BoardRow[]; defaultDay: string }) {
  const moveItems = useMoveItems();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetDay, setTargetDay] = useState(defaultDay);

  if (overdue.length === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openPanel() {
    setSelected(new Set(overdue.map((o) => o.id))); // default: all selected
    setTargetDay(defaultDay);
    setOpen(true);
  }

  function sweep() {
    const ids = [...selected];
    if (ids.length > 0) moveItems.mutate({ ids, day: targetDay });
    setOpen(false);
  }

  return (
    <div className="rounded border border-overdue/50 bg-overdue/10">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="inline-flex items-center gap-2 text-ui text-overdue">
          <AlertTriangle size={16} aria-hidden />
          {overdue.length} overdue
        </span>
        <button
          onClick={open ? () => setOpen(false) : openPanel}
          className="rounded border border-overdue px-3 py-1 text-ui text-overdue hover:bg-overdue hover:text-surface"
        >
          {open ? "Cancel" : "Sweep →"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-2 border-t border-overdue/30 px-3 py-3">
          <ul className="max-h-40 overflow-y-auto">
            {overdue.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-ui">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                  <span className="tabular w-16 shrink-0 text-data text-ink-soft">
                    {o.start_minute != null ? fmtMinute(o.start_minute) : "Anytime"}
                  </span>
                  <span className="truncate">{o.title}</span>
                  <span className="tabular ml-auto shrink-0 text-data text-ink-soft">{o.day}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2">
            <label className="text-data text-ink-soft">Move to</label>
            <input
              type="date"
              value={targetDay}
              onChange={(e) => setTargetDay(e.target.value)}
              className="tabular rounded border border-rule bg-surface px-2 py-1 text-ui"
            />
            <button
              onClick={sweep}
              disabled={selected.size === 0}
              className="rounded bg-ink px-3 py-1 text-ui text-surface disabled:opacity-50"
            >
              Move {selected.size}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
