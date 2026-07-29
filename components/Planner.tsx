"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fmtDay, todayPKT } from "@/lib/pkt-dates";
import { rangeFor } from "@/lib/query-keys";
import { useCalendar } from "@/lib/queries";
import { useTrashItem, useRestoreItem } from "@/lib/mutations";
import type { BoardRow } from "@/lib/types";
import type { ComposerHandle } from "@/components/ItemComposer";
import { SectionPane } from "@/components/SectionPane";
import { ItemEditor } from "@/components/ItemEditor";
import { UndoToast } from "@/components/UndoToast";
import { SignOutButton } from "@/components/SignOutButton";

// The single screen for M2: the two section panes over a focused day, with a
// shared editor sheet and undo toast. The shared calendar and Minute Ledger
// arrive in M3/M4; day navigation here stands in for the calendar's day focus.

export function Planner() {
  const [day, setDay] = useState(() => todayPKT());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; row: BoardRow } | null>(null);

  const range = rangeFor(day, "day");
  const calendar = useCalendar(range);
  const trash = useTrashItem();
  const restore = useRestoreItem();

  const taskComposer = useRef<ComposerHandle>(null);
  const goalComposer = useRef<ComposerHandle>(null);

  const editing = editingId
    ? (calendar.data ?? []).find((i) => i.id === editingId) ?? null
    : null;

  // Close the editor if its item disappears (e.g. trashed or moved off-range).
  useEffect(() => {
    if (editingId && calendar.data && !calendar.data.some((i) => i.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, calendar.data]);

  // T / G focus the composers from anywhere (brief §11), unless typing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(el.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        taskComposer.current?.focus();
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        goalComposer.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleTrash(row: BoardRow) {
    trash.mutate({ id: row.id, kind: row.kind });
    setToast({ message: `Deleted ${row.title}`, row });
  }

  const isToday = day === todayPKT();

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-6">
      <header className="mb-6 flex items-center justify-between border-b border-rule pb-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-head">Minute</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDay(addDays(day, -1))}
              aria-label="Previous day"
              className="rounded p-1 text-ink-soft hover:text-ink"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setDay(addDays(day, 1))}
              aria-label="Next day"
              className="rounded p-1 text-ink-soft hover:text-ink"
            >
              <ChevronRight size={18} />
            </button>
            <span className="font-display text-ui text-ink-soft">{fmtDay(day)}</span>
            {!isToday && (
              <button
                onClick={() => setDay(todayPKT())}
                className="ml-2 rounded border border-rule px-2 py-0.5 text-data text-ink-soft hover:text-ink"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <SignOutButton />
      </header>

      <div className="grid flex-1 gap-8 md:grid-cols-2">
        <SectionPane
          ref={taskComposer}
          kind="task"
          day={day}
          range={range}
          onOpen={(item) => setEditingId(item.id)}
        />
        <SectionPane
          ref={goalComposer}
          kind="goal"
          day={day}
          range={range}
          onOpen={(item) => setEditingId(item.id)}
        />
      </div>

      {editing && (
        <ItemEditor
          key={editing.id}
          item={editing}
          onClose={() => setEditingId(null)}
          onTrash={handleTrash}
        />
      )}

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={() => {
            restore.mutate({ row: toast.row });
            setToast(null);
          }}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
