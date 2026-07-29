"use client";

import { useEffect } from "react";

// Every destructive action is undoable (brief §2.4). A toast with Undo follows
// it; there is never a confirm dialog — the undo is the confirmation. Auto-
// dismisses after 8 seconds (brief §10).

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 8000,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-4 rounded border border-rule bg-ink px-4 py-2 text-ui text-surface shadow-lg"
      role="status"
    >
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="rounded px-1 font-medium underline underline-offset-2 hover:no-underline"
      >
        Undo
      </button>
    </div>
  );
}
