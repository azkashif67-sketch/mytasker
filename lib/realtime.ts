"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// One realtime subscription for the whole app (brief §8). On any change to the
// signed-in user's rows in public.items, invalidate the range-scoped queries
// that cover the affected day — this is what keeps the phone and laptop in step.

type ItemRecord = { day?: string } | null;

function invalidateForDay(qc: QueryClient, day: string | undefined): void {
  if (!day) {
    // No day on the payload (e.g. an UPDATE without REPLICA IDENTITY FULL):
    // fall back to invalidating everything.
    qc.invalidateQueries({ queryKey: ["board"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["load"] });
    return;
  }
  qc.invalidateQueries({
    predicate: (q) => {
      const key = q.queryKey as unknown[];
      if (key[0] === "board") {
        const [, , s, e] = key as [string, string, string, string];
        return typeof s === "string" && typeof e === "string" && day >= s && day <= e;
      }
      if (key[0] === "calendar" || key[0] === "load") {
        const [, s, e] = key as [string, string, string];
        return typeof s === "string" && typeof e === "string" && day >= s && day <= e;
      }
      return false;
    },
  });
}

export function useRealtimeSync(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const channel = supabase
        .channel("items-sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "items",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new as ItemRecord;
            const prev = payload.old as ItemRecord;
            invalidateForDay(qc, next?.day);
            if (prev?.day && prev.day !== next?.day) invalidateForDay(qc, prev.day);
          },
        )
        .subscribe();

      return channel;
    };

    const channelPromise = setup();

    return () => {
      cancelled = true;
      channelPromise.then((channel) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [qc]);
}
