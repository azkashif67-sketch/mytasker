"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { fmtMinute } from "@/lib/pkt-dates";
import { parseClock, parseMinutes, validateDraft } from "@/lib/item-input";
import { useUpdateItem, useMoveItem } from "@/lib/mutations";
import { StatusControl } from "@/components/StatusControl";
import type { BoardRow, ItemStatus } from "@/lib/types";

// Full edit in a right side sheet (brief §10, §11). There is no Save button —
// fields commit on blur. Escape closes (blurring commits the focused field).
// Delete soft-trashes and hands an undo toast back to the parent.

export function ItemEditor({
  item,
  onClose,
  onTrash,
}: {
  item: BoardRow;
  onClose: () => void;
  onTrash: (row: BoardRow) => void;
}) {
  const update = useUpdateItem();
  const move = useMoveItem();

  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [start, setStart] = useState(item.start_minute != null ? fmtMinute(item.start_minute) : "");
  const [minutes, setMinutes] = useState(item.duration_minutes != null ? String(item.duration_minutes) : "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commit(changes: Parameters<typeof update.mutate>[0]["changes"]) {
    update.mutate({ id: item.id, kind: item.kind, changes });
  }

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed === item.title) return;
    const errs = validateDraft(item.kind, {
      title,
      start_minute: item.start_minute,
      duration_minutes: item.duration_minutes,
    });
    if (errs.title) {
      setError(errs.title);
      setTitle(item.title);
      return;
    }
    setError(null);
    commit({ title: trimmed });
  }

  function commitTiming(nextStartRaw: string, nextMinutesRaw: string) {
    const start_minute = parseClock(nextStartRaw);
    const duration_minutes = parseMinutes(nextMinutesRaw);
    const errs = validateDraft(item.kind, { title: item.title, start_minute, duration_minutes });
    if (errs.start_minute || errs.duration_minutes) {
      setError(errs.start_minute ?? errs.duration_minutes ?? null);
      return;
    }
    setError(null);
    const changes: Record<string, number | null> = {};
    if (start_minute !== item.start_minute) changes.start_minute = start_minute;
    if (duration_minutes !== item.duration_minutes) changes.duration_minutes = duration_minutes;
    if (Object.keys(changes).length > 0) commit(changes);
  }

  const accent = item.kind === "task" ? "text-task" : "text-goal";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[360px] flex-col gap-4 border-l border-rule bg-surface p-5 shadow-lg"
        role="dialog"
        aria-label={`Edit ${item.kind}`}
      >
        <header className="flex items-center justify-between">
          <span className={`font-display text-ui uppercase tracking-wide ${accent}`}>
            {item.kind === "task" ? "Task" : "Study block"}
          </span>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X size={18} />
          </button>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-data text-ink-soft">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            className="rounded border border-rule bg-ground px-2 py-1.5 text-ui"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-data text-ink-soft">Start</span>
            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onBlur={() => commitTiming(start, minutes)}
              placeholder="Anytime"
              inputMode="numeric"
              className="tabular rounded border border-rule bg-ground px-2 py-1.5 text-ui"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-data text-ink-soft">Minutes{item.kind === "goal" ? " *" : ""}</span>
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onBlur={() => commitTiming(start, minutes)}
              inputMode="numeric"
              className="tabular rounded border border-rule bg-ground px-2 py-1.5 text-ui"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-data text-ink-soft">Day</span>
          <input
            type="date"
            value={item.day}
            onChange={(e) => {
              if (e.target.value && e.target.value !== item.day) {
                move.mutate({ id: item.id, day: e.target.value });
              }
            }}
            className="tabular rounded border border-rule bg-ground px-2 py-1.5 text-ui"
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-data text-ink-soft">Status</span>
          <div className="flex items-center gap-2">
            <StatusControl
              status={item.status}
              onChange={(next: ItemStatus) => commit({ status: next })}
            />
            <span className="text-ui capitalize">{item.status}</span>
          </div>
        </div>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-data text-ink-soft">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== (item.notes ?? "")) commit({ notes: notes || null });
            }}
            className="min-h-24 flex-1 rounded border border-rule bg-ground px-2 py-1.5 text-ui"
          />
        </label>

        {error && (
          <p className="text-[11px] text-conflict" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={() => {
            onTrash(item);
            onClose();
          }}
          className="mt-auto inline-flex items-center gap-1.5 self-start rounded px-2 py-1 text-ui text-conflict hover:underline"
        >
          <Trash2 size={16} aria-hidden />
          Delete
        </button>
      </aside>
    </>
  );
}
