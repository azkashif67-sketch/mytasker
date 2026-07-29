"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { fmtDay, todayPKT } from "@/lib/pkt-dates";
import {
  eachBoard,
  eachCalendar,
  findCalendarRow,
  invalidateAll,
  resyncDays,
  restoreCaches,
  snapshotCaches,
  type CacheSnapshot,
} from "@/lib/optimistic";
import type { BoardRow, ItemKind, ItemStatus } from "@/lib/types";

// Write hooks (brief §5, §8). Every mutation:
//   1. cancels in-flight reads, snapshots the caches,
//   2. applies the change optimistically and recomputes flags + load locally,
//   3. rolls back on error, and
//   4. invalidates all four keys on settle so the server value replaces ours.
// Writes only ever touch the `tasks`/`goals` views and the move/trash RPCs.

export interface AddItemInput {
  title: string;
  day: string;
  start_minute?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
}

export interface UpdateItemInput {
  id: string;
  kind: ItemKind;
  changes: Partial<
    Pick<BoardRow, "title" | "notes" | "start_minute" | "duration_minutes" | "status">
  >;
}

export interface MoveInput {
  id: string;
  day: string;
  start_minute?: number | null;
}

function tempRow(kind: ItemKind, input: AddItemInput): BoardRow {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    user_id: "optimistic",
    kind,
    title: input.title.trim(),
    notes: input.notes ?? null,
    day: input.day,
    day_label: fmtDay(input.day),
    start_minute: input.start_minute ?? null,
    duration_minutes: input.duration_minutes ?? null,
    block: null,
    status: "unfinished",
    sort_order: 0,
    completed_at: null,
    created_at: now,
    updated_at: now,
    is_overdue: input.day < todayPKT(),
    is_overlapped: false,
    overlaps_with_ids: [],
    overlaps_with_titles: [],
  };
}

// -- add --------------------------------------------------------------------

export function useAddItem(kind: ItemKind) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddItemInput) => {
      const supabase = createClient();
      // Branch on a concrete relation name so supabase-js can infer the Insert
      // type (a union of relation names collapses inference).
      const payload = {
        title: input.title.trim(),
        day: input.day,
        start_minute: input.start_minute ?? null,
        duration_minutes: input.duration_minutes ?? null,
        notes: input.notes ?? null,
      };
      const { error } =
        kind === "task"
          ? await supabase.from("tasks").insert(payload)
          : await supabase.from("goals").insert(payload);
      if (error) throw error;
    },
    onMutate: async (input): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      const row = tempRow(kind, input);
      eachCalendar(qc, (rows) => [...rows, row]);
      eachBoard(qc, kind, (rows) => [...rows, row]);
      resyncDays(qc, [input.day]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}

// -- update (non-day fields) ------------------------------------------------

export function useUpdateItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, kind, changes }: UpdateItemInput) => {
      const supabase = createClient();
      const { error } =
        kind === "task"
          ? await supabase.from("tasks").update(changes).eq("id", id)
          : await supabase.from("goals").update(changes).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, kind, changes }): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      const existing = findCalendarRow(qc, id);
      const patch = (r: BoardRow): BoardRow =>
        r.id === id ? applyStatusPatch({ ...r, ...changes }, r.status) : r;
      eachCalendar(qc, (rows) => rows.map(patch));
      eachBoard(qc, kind, (rows) => rows.map(patch));
      if (existing) resyncDays(qc, [existing.day]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}

/**
 * Mirror the DB `completed_at` trigger locally (brief §6): completing stamps it,
 * moving off completed clears it. Never sent to the server — the trigger owns it.
 */
function applyStatusPatch(row: BoardRow, prevStatus: ItemStatus): BoardRow {
  if (row.status === "completed" && prevStatus !== "completed") {
    return { ...row, completed_at: row.completed_at ?? new Date().toISOString() };
  }
  if (row.status !== "completed") {
    return { ...row, completed_at: null };
  }
  return row;
}

// -- move (one item) --------------------------------------------------------

export function useMoveItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, day, start_minute }: MoveInput) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("move_item", {
        p_id: id,
        p_day: day,
        p_start_minute: start_minute ?? null,
      });
      if (error) throw error;
    },
    onMutate: async ({ id, day, start_minute }): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      const existing = findCalendarRow(qc, id);
      const oldDay = existing?.day;
      const patch = (r: BoardRow): BoardRow =>
        r.id === id
          ? {
              ...r,
              day,
              day_label: fmtDay(day),
              start_minute: start_minute ?? r.start_minute,
              is_overdue: r.status !== "completed" && day < todayPKT(),
            }
          : r;
      eachCalendar(qc, (rows) => rows.map(patch));
      eachBoard(qc, "task", (rows) => rows.map(patch));
      eachBoard(qc, "goal", (rows) => rows.map(patch));
      resyncDays(qc, oldDay && oldDay !== day ? [oldDay, day] : [day]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}

// -- move (many items — the sweep) ------------------------------------------

export function useMoveItems() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, day }: { ids: string[]; day: string }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("move_items", { p_ids: ids, p_day: day });
      if (error) throw error;
    },
    onMutate: async ({ ids, day }): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      const idSet = new Set(ids);
      const affected = new Set<string>([day]);
      for (const id of ids) {
        const r = findCalendarRow(qc, id);
        if (r) affected.add(r.day);
      }
      const patch = (r: BoardRow): BoardRow =>
        idSet.has(r.id)
          ? {
              ...r,
              day,
              day_label: fmtDay(day),
              is_overdue: r.status !== "completed" && day < todayPKT(),
            }
          : r;
      eachCalendar(qc, (rows) => rows.map(patch));
      eachBoard(qc, "task", (rows) => rows.map(patch));
      eachBoard(qc, "goal", (rows) => rows.map(patch));
      resyncDays(qc, [...affected]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}

// -- trash + restore (soft delete with undo, brief §2.4) --------------------

export function useTrashItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; kind: ItemKind }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("trash_item", { p_id: id });
      if (error) throw error;
    },
    onMutate: async ({ id, kind }): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      const existing = findCalendarRow(qc, id);
      const remove = (rows: BoardRow[]) => rows.filter((r) => r.id !== id);
      eachCalendar(qc, remove);
      eachBoard(qc, kind, remove);
      if (existing) resyncDays(qc, [existing.day]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}

export function useRestoreItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ row }: { row: BoardRow }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("restore_item", { p_id: row.id });
      if (error) throw error;
    },
    onMutate: async ({ row }): Promise<CacheSnapshot> => {
      await qc.cancelQueries();
      const snapshot = snapshotCaches(qc);
      eachCalendar(qc, (rows) => [...rows, row]);
      eachBoard(qc, row.kind, (rows) => [...rows, row]);
      resyncDays(qc, [row.day]);
      return snapshot;
    },
    onError: (_e, _v, ctx) => ctx && restoreCaches(qc, ctx),
    onSettled: () => invalidateAll(qc),
  });
}
