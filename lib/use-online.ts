"use client";

import { useSyncExternalStore } from "react";

// Tracks connectivity for the offline strip (brief §14, §16). No offline writes
// in v1 — the composers are disabled while offline.

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // assume online during SSR
  );
}
