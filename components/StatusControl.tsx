"use client";

import { Circle, CircleDashed, CheckCircle2 } from "lucide-react";
import type { ItemStatus } from "@/lib/types";

// Tri-state status, cycled by click (brief §11): unfinished -> ongoing ->
// completed -> unfinished. Space/Enter cycle it too (it is a button). Status is
// always set manually — there is no timer (brief §6).

const ORDER: ItemStatus[] = ["unfinished", "ongoing", "completed"];

const META: Record<ItemStatus, { label: string; Icon: typeof Circle; className: string }> = {
  unfinished: { label: "Unfinished", Icon: Circle, className: "text-ink-soft" },
  ongoing: { label: "Ongoing", Icon: CircleDashed, className: "text-task" },
  completed: { label: "Completed", Icon: CheckCircle2, className: "text-goal" },
};

export function StatusControl({
  status,
  onChange,
  size = 18,
}: {
  status: ItemStatus;
  onChange: (next: ItemStatus) => void;
  size?: number;
}) {
  const { label, Icon, className } = META[status];
  const next = ORDER[(ORDER.indexOf(status) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(next);
      }}
      className={`grid place-items-center rounded transition-colors duration-state ease-out ${className}`}
      aria-label={`Status: ${label}. Activate to mark ${META[next].label.toLowerCase()}.`}
    >
      <Icon size={size} aria-hidden />
    </button>
  );
}
