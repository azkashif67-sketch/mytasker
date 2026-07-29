"use client";

import { createContext, useCallback, useContext, useState } from "react";

// A single polite live region announces status changes and moves (brief §15).

const AnnounceContext = createContext<(message: string) => void>(() => {});

export function useAnnounce() {
  return useContext(AnnounceContext);
}

export function Announcer({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((m: string) => {
    // Clear first so repeating the same message is still announced.
    setMessage("");
    requestAnimationFrame(() => setMessage(m));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
