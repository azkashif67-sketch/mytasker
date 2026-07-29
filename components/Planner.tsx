"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmtDay, todayPKT } from "@/lib/pkt-dates";
import { rangeFor, shiftPeriod, type CalendarView as ViewName } from "@/lib/query-keys";
import { useCalendar } from "@/lib/queries";
import { useTrashItem, useRestoreItem } from "@/lib/mutations";
import type { BoardRow } from "@/lib/types";
import type { ComposerHandle } from "@/components/ItemComposer";
import { SectionPane } from "@/components/SectionPane";
import { ItemEditor } from "@/components/ItemEditor";
import { UndoToast } from "@/components/UndoToast";
import { SweepBar } from "@/components/SweepBar";
import { MinuteLedger } from "@/components/MinuteLedger";
import { SignOutButton } from "@/components/SignOutButton";

// FullCalendar is client-only; load it without SSR to avoid hydration issues.
const CalendarView = dynamic(
  () => import("@/components/CalendarView").then((m) => m.CalendarView),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-ui text-ink-soft">Loading calendar…</div> },
);

const VIEWS: ViewName[] = ["month", "week", "day"];

export function Planner() {
  const [day, setDay] = useState(() => todayPKT());
  const [view, setView] = useState<ViewName>("month");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; row: BoardRow } | null>(null);

  const range = useMemo(() => rangeFor(day, view), [day, view]);
  const calendar = useCalendar(range);
  const trash = useTrashItem();
  const restore = useRestoreItem();

  const taskComposer = useRef<ComposerHandle>(null);
  const goalComposer = useRef<ComposerHandle>(null);

  const editing = editingId ? (calendar.data ?? []).find((i) => i.id === editingId) ?? null : null;
  const overdue = (calendar.data ?? []).filter((i) => i.is_overdue);
  const dayItems = (calendar.data ?? []).filter((i) => i.day === day);

  useEffect(() => {
    if (editingId && calendar.data && !calendar.data.some((i) => i.id === editingId)) {
      setEditingId(null);
    }
  }, [editingId, calendar.data]);

  // Keyboard map subset (brief §15): T/G composers, [ ] prev/next, 1/2/3 views.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(el.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "t": case "T": e.preventDefault(); taskComposer.current?.focus(); break;
        case "g": case "G": e.preventDefault(); goalComposer.current?.focus(); break;
        case "[": setDay((d) => shiftPeriod(d, view, -1)); break;
        case "]": setDay((d) => shiftPeriod(d, view, 1)); break;
        case "1": setView("month"); break;
        case "2": setView("week"); break;
        case "3": setView("day"); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  function handleTrash(row: BoardRow) {
    trash.mutate({ id: row.id, kind: row.kind });
    setToast({ message: `Deleted ${row.title}`, row });
  }

  const isToday = day === todayPKT();

  return (
    <div className="flex min-h-dvh flex-col px-4 py-4 lg:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-head">Minute</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setDay(shiftPeriod(day, view, -1))} aria-label="Previous period" className="rounded p-1 text-ink-soft hover:text-ink">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setDay(shiftPeriod(day, view, 1))} aria-label="Next period" className="rounded p-1 text-ink-soft hover:text-ink">
              <ChevronRight size={18} />
            </button>
            <span className="font-display text-ui text-ink-soft">{fmtDay(day)}</span>
            {!isToday && (
              <button onClick={() => setDay(todayPKT())} className="ml-2 rounded border border-rule px-2 py-0.5 text-data text-ink-soft hover:text-ink">
                Today
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded border border-rule" role="tablist" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-ui capitalize ${view === v ? "bg-ink text-surface" : "text-ink-soft hover:text-ink"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <SignOutButton />
        </div>
      </header>

      <div data-drag-source className="grid flex-1 gap-6 lg:grid-cols-[320px_1fr_320px]">
        <div className="order-2 lg:order-1">
          <SectionPane ref={taskComposer} kind="task" day={day} range={range} onOpen={(i) => setEditingId(i.id)} />
        </div>

        <div className="order-1 flex min-h-[520px] flex-col gap-3 lg:order-2 lg:min-h-0">
          {view === "day" && (
            <div className="flex flex-col gap-1.5 rounded border border-rule bg-surface p-3">
              {/* Day-view header ledger: both kinds against the 300-minute budget. */}
              <MinuteLedger items={dayItems} size="bar" />
              <MinuteLedger items={dayItems} size="inline" />
            </div>
          )}
          <div className="min-h-[520px] flex-1">
            <CalendarView day={day} view={view} range={range} onOpen={setEditingId} onPickDay={(d) => { setDay(d); setView("day"); }} />
          </div>
          <SweepBar overdue={overdue} defaultDay={todayPKT()} />
        </div>

        <div className="order-3">
          <SectionPane ref={goalComposer} kind="goal" day={day} range={range} onOpen={(i) => setEditingId(i.id)} />
        </div>
      </div>

      {editing && (
        <ItemEditor key={editing.id} item={editing} onClose={() => setEditingId(null)} onTrash={handleTrash} />
      )}

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={() => { restore.mutate({ row: toast.row }); setToast(null); }}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
