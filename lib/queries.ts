"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys, type DateRange } from "@/lib/query-keys";
import type { BoardRow, DailyLoadRow, ItemKind } from "@/lib/types";

// Read hooks (brief §8). Every read is range-scoped and comes from the enriched
// views: tasks_board / goals_board / calendar / daily_load. The section panes
// and the calendar all read from the same cached range.

async function fetchBoard(kind: ItemKind, range: DateRange): Promise<BoardRow[]> {
  const supabase = createClient();
  const view = kind === "task" ? "tasks_board" : "goals_board";
  const { data, error } = await supabase
    .from(view)
    .select("*")
    .gte("day", range.start)
    .lte("day", range.end);
  if (error) throw error;
  return (data ?? []) as BoardRow[];
}

export function useBoard(kind: ItemKind, range: DateRange) {
  return useQuery({
    queryKey: queryKeys.board(kind, range),
    queryFn: () => fetchBoard(kind, range),
  });
}

export const useTasks = (range: DateRange) => useBoard("task", range);
export const useGoals = (range: DateRange) => useBoard("goal", range);

export function useCalendar(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.calendar(range),
    queryFn: async (): Promise<BoardRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("calendar")
        .select("*")
        .gte("day", range.start)
        .lte("day", range.end);
      if (error) throw error;
      return (data ?? []) as BoardRow[];
    },
  });
}

export function useDailyLoad(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.load(range),
    queryFn: async (): Promise<DailyLoadRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_load")
        .select("*")
        .gte("day", range.start)
        .lte("day", range.end);
      if (error) throw error;
      return (data ?? []) as DailyLoadRow[];
    },
  });
}
