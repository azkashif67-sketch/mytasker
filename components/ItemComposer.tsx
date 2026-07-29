"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useAddItem } from "@/lib/mutations";
import { useOnline } from "@/lib/use-online";
import {
  parseClock,
  parseMinutes,
  validateDraft,
  hasErrors,
  type FieldErrors,
} from "@/lib/item-input";
import type { ItemKind } from "@/lib/types";

// Single-line inline add (brief §5, §11). Type a title, optionally a duration
// and a time, press Enter. The item lands on the focused day. Never a modal.

export interface ComposerHandle {
  focus: () => void;
}

export const ItemComposer = forwardRef<ComposerHandle, { kind: ItemKind; day: string }>(
  function ItemComposer({ kind, day }, ref) {
    const add = useAddItem(kind);
    const online = useOnline();
    const titleRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState("");
    const [minutes, setMinutes] = useState("");
    const [time, setTime] = useState("");
    const [errors, setErrors] = useState<FieldErrors>({});

    useImperativeHandle(ref, () => ({ focus: () => titleRef.current?.focus() }));

    function submit(e: React.FormEvent) {
      e.preventDefault();
      if (!online) return; // no offline writes in v1 (brief §16)
      const draft = {
        title,
        start_minute: parseClock(time),
        duration_minutes: parseMinutes(minutes),
      };
      const found = validateDraft(kind, draft);
      if (hasErrors(found)) {
        setErrors(found);
        return;
      }
      add.mutate({
        title,
        day,
        start_minute: draft.start_minute,
        duration_minutes: draft.duration_minutes,
      });
      setTitle("");
      setMinutes("");
      setTime("");
      setErrors({});
      titleRef.current?.focus();
    }

    const accent = kind === "task" ? "focus-within:border-task" : "focus-within:border-goal";
    const noun = kind === "task" ? "task" : "goal";

    return (
      <form onSubmit={submit} className="flex flex-col gap-1">
        <div
          className={`flex items-center gap-1 rounded border border-rule bg-surface px-2 py-1 ${accent} ${
            online ? "" : "opacity-50"
          }`}
        >
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={online ? `New ${noun}` : "Offline"}
            aria-label={`New ${noun} title`}
            disabled={!online}
            className="min-w-0 flex-1 bg-transparent text-ui outline-none"
          />
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="time"
            aria-label="Start time, optional"
            inputMode="numeric"
            disabled={!online}
            className="tabular w-14 bg-transparent text-data text-ink-soft outline-none"
          />
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder={kind === "goal" ? "min*" : "min"}
            aria-label={kind === "goal" ? "Duration in minutes, required" : "Duration in minutes, optional"}
            inputMode="numeric"
            disabled={!online}
            className="tabular w-12 bg-transparent text-data text-ink-soft outline-none"
          />
          <button
            type="submit"
            disabled={!online}
            className="rounded px-1.5 text-ui text-ink-soft hover:text-ink disabled:opacity-50"
            aria-label={`Add ${noun}`}
          >
            +
          </button>
        </div>
        {(errors.title || errors.duration_minutes || errors.start_minute) && (
          <p className="px-1 text-[11px] text-conflict" role="alert">
            {errors.title ?? errors.duration_minutes ?? errors.start_minute}
          </p>
        )}
      </form>
    );
  },
);
