"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, ListTodo, CalendarDays, GraduationCap } from "lucide-react";
import { fmtDay, todayPKT } from "@/lib/pkt-dates";
import { rangeFor, shiftPeriod, type CalendarView as ViewName } from "@/lib/query-keys";
import { useCalendar } from "@/lib/queries";
import { useTrashItem, useRestoreItem, useMoveItem } from "@/lib/mutations";
import { useOnline } from "@/lib/use-online";
import type { BoardRow } from "@/lib/types";
import type { ComposerHandle } from "@/components/ItemComposer";
import { SectionPane } from "@/components/SectionPane";
import { ItemEditor } from "@/components/ItemEditor";
import { UndoToast } from "@/components/UndoToast";
import { SweepBar } from "@/components/SweepBar";
import { MinuteLedger } from "@/components/MinuteLedger";
import { SignOutButton } from "@/components/SignOutButton";
import { Announcer, useAnnounce } from "@/components/Announcer";

const CalendarView = dynamic(
  () => import("@/components/CalendarView").then((m) => m.CalendarView),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-ui text-ink-soft">Loading calendar…</div> },
);

const VIEWS: ViewName[] = ["month", "week", "day"];
type MobileTab = "tasks" | "calendar" | "learning";

export function Planner() {
  return (
    <Announcer>
      <PlannerInner />
    </Announcer>
  );
}

function PlannerInner() {
  const [day, setDay] = useState(() => todayPKT());
  const [view, setView] = useState<ViewName>("month");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; row: BoardRow } | null>(null);
  const [moveTarget, setMoveTarget] = useState<BoardRow | null>(null);
  const [tab, setTab] = useState<MobileTab>("calendar");

  const range = useMemo(() => rangeFor(day, view), [day, view]);
  const calendar = useCalendar(range);
  const trash = useTrashItem();
  const restore = useRestoreItem();
  const move = useMoveItem();
  const online = useOnline();
  const announce = useAnnounce();

  const taskComposer = useRef<ComposerHandle>(null);
  const goalComposer = useRef<ComposerHandle>(null);

  const editing = editingId ? (calendar.data ?? []).find((i) => i.id === editingId) ?? null : null;
  const overdue = (calendar.data ?? []).filter((i) => i.is_overdue);
  const dayItems = (calendar.data ?? []).filter((i) => i.day === day);

  useEffect(() => {
    if (editingId && calendar.data && !calendar.data.some((i) => i.id === editingId)) setEditingId(null);
  }, [editingId, calendar.data]);

  function handleTrash(row: BoardRow) {
    trash.mutate({ id: row.id, kind: row.kind });
    setToast({ message: `Deleted ${row.title}`, row });
    announce(`Deleted ${row.title}`);
  }

  function undo() {
    if (!toast) return;
    restore.mutate({ row: toast.row });
    announce(`Restored ${toast.row.title}`);
    setToast(null);
  }

  // Keyboard map (brief §15). Row-scoped keys (E/M/Space/⌫) live on ItemRow.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(el.tagName);
      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        if (toast) { e.preventDefault(); undo(); }
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, toast]);

  const isToday = day === todayPKT();
  const paneProps = (kind: "task" | "goal") => ({
    kind,
    day,
    range,
    onOpen: (i: BoardRow) => setEditingId(i.id),
    onMove: (i: BoardRow) => setMoveTarget(i),
    onTrash: handleTrash,
  });

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-20 pt-4 lg:px-6 lg:pb-4">
      {!online && (
        <div className="mb-3 rounded border border-overdue/50 bg-overdue/10 px-3 py-2 text-ui text-overdue" role="status">
          Offline. Changes will sync when you reconnect.
        </div>
      )}

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
          <div className="hidden overflow-hidden rounded border border-rule sm:flex" role="tablist" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={`px-3 py-1 text-ui capitalize ${view === v ? "bg-ink text-surface" : "text-ink-soft hover:text-ink"}`}>
                {v}
              </button>
            ))}
          </div>
          <SignOutButton />
        </div>
      </header>

      <div data-drag-source className="flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-[320px_1fr_320px]">
        <div className={`${tab === "tasks" ? "block" : "hidden"} lg:block`}>
          <SectionPane ref={taskComposer} {...paneProps("task")} />
        </div>

        <div className={`${tab === "calendar" ? "flex" : "hidden"} min-h-[520px] flex-col gap-3 lg:flex lg:min-h-0`}>
          {view === "day" && (
            <div className="flex flex-col gap-1.5 rounded border border-rule bg-surface p-3">
              <MinuteLedger items={dayItems} size="bar" />
              <MinuteLedger items={dayItems} size="inline" />
            </div>
          )}
          <div className="min-h-[520px] flex-1">
            <CalendarView day={day} view={view} range={range} onOpen={setEditingId} onPickDay={(d) => { setDay(d); setView("day"); }} />
          </div>
          <SweepBar overdue={overdue} defaultDay={todayPKT()} />
        </div>

        <div className={`${tab === "learning" ? "block" : "hidden"} lg:block`}>
          <SectionPane ref={goalComposer} {...paneProps("goal")} />
        </div>
      </div>

      {/* Mobile 3-tab bar (brief §9). Calendar tab defaults to Day view. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-rule bg-surface lg:hidden" aria-label="Sections">
        <TabButton active={tab === "tasks"} label="Tasks" onClick={() => setTab("tasks")} Icon={ListTodo} />
        <TabButton active={tab === "calendar"} label="Calendar" onClick={() => { setTab("calendar"); setView("day"); }} Icon={CalendarDays} />
        <TabButton active={tab === "learning"} label="Learning" onClick={() => setTab("learning")} Icon={GraduationCap} />
      </nav>

      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditingId(null)} onTrash={handleTrash} />}

      {moveTarget && (
        <MovePopover
          item={moveTarget}
          onClose={() => setMoveTarget(null)}
          onPick={(d) => {
            move.mutate({ id: moveTarget.id, day: d });
            announce(`Moved ${moveTarget.title} to ${fmtDay(d)}`);
            setMoveTarget(null);
          }}
        />
      )}

      {toast && <UndoToast message={toast.message} onUndo={undo} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function TabButton({ active, label, onClick, Icon }: { active: boolean; label: string; onClick: () => void; Icon: typeof ListTodo }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-ink" : "text-ink-soft"}`}
    >
      <Icon size={20} aria-hidden />
      {label}
    </button>
  );
}

// Keyboard equivalent of drag-and-drop (brief §11, §15): focus a row, press M,
// pick a date.
function MovePopover({ item, onClose, onPick }: { item: BoardRow; onClose: () => void; onPick: (day: string) => void }) {
  const [value, setValue] = useState(item.day);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 p-4" onClick={onClose}>
      <div className="flex flex-col gap-3 rounded border border-rule bg-surface p-4" role="dialog" aria-label={`Move ${item.title}`} onClick={(e) => e.stopPropagation()}>
        <span className="text-ui">Move “{item.title}” to</span>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="tabular rounded border border-rule bg-ground px-2 py-1.5 text-ui"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-1 text-ui text-ink-soft hover:text-ink">Cancel</button>
          <button onClick={() => value && onPick(value)} className="rounded bg-ink px-3 py-1 text-ui text-surface">Move</button>
        </div>
      </div>
    </div>
  );
}
