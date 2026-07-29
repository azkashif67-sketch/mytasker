"use client";

import { forwardRef } from "react";
import { useBoard } from "@/lib/queries";
import { useUpdateItem } from "@/lib/mutations";
import { orderForSection } from "@/lib/item-input";
import type { DateRange } from "@/lib/query-keys";
import type { BoardRow, ItemKind, ItemStatus } from "@/lib/types";
import { ItemComposer, type ComposerHandle } from "@/components/ItemComposer";
import { ItemRow } from "@/components/ItemRow";
import { MinuteLedger } from "@/components/MinuteLedger";

// One component for both sections, parameterised by `kind` (brief §10). The only
// differences are the accent colour, the composer's required-duration hint, and
// the copy — there is no TaskPane / GoalPane fork.

const COPY = {
  task: { heading: "Tasks", empty: "No tasks today. Press T to add one." },
  goal: { heading: "Learning", empty: "No study blocks today. Press G to add one." },
};

export const SectionPane = forwardRef<
  ComposerHandle,
  { kind: ItemKind; day: string; range: DateRange; onOpen: (item: BoardRow) => void }
>(function SectionPane({ kind, day, range, onOpen }, composerRef) {
  const board = useBoard(kind, range);
  const update = useUpdateItem();

  const items = orderForSection((board.data ?? []).filter((i) => i.day === day));
  const accent = kind === "task" ? "text-task" : "text-goal";

  return (
    <section className="flex w-full flex-col gap-3" aria-label={COPY[kind].heading}>
      <header className="flex flex-col gap-2 border-b border-rule pb-2">
        <h2 className={`font-display text-ui uppercase tracking-wide ${accent}`}>{COPY[kind].heading}</h2>
        {/* This pane's contribution to the shared 300-minute budget (brief §13). */}
        <MinuteLedger items={items} size="bar" />
      </header>

      <ItemComposer ref={composerRef} kind={kind} day={day} />

      <div className="flex flex-col">
        {board.isLoading ? (
          <p className="px-1 py-6 text-ui text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-1 py-6 text-ui text-ink-soft">{COPY[kind].empty}</p>
        ) : (
          items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onOpen={() => onOpen(item)}
              onStatus={(next: ItemStatus) =>
                update.mutate({ id: item.id, kind, changes: { status: next } })
              }
            />
          ))
        )}
      </div>
    </section>
  );
});
