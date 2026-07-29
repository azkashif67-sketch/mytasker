"use client";

import { useRealtimeSync } from "@/lib/realtime";

// Mounts the single app-wide realtime subscription (brief §8). Renders nothing.
export function RealtimeBridge() {
  useRealtimeSync();
  return null;
}
