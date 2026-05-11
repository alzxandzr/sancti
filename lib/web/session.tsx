import React, { createContext, useContext, useEffect, useState } from "react";
import { ensureWebSession } from "./supabase";

interface SessionState {
  /** Supabase auth.users.id (UUID) for the current device. Null until the
   *  anonymous sign-in resolves, or stays null if the provider is disabled. */
  userId: string | null;
  /** True while the initial sign-in is in flight. */
  loading: boolean;
}

const SessionContext = createContext<SessionState>({ userId: null, loading: true });

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<SessionState>({ userId: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    void ensureWebSession()
      .then((userId) => {
        if (!cancelled) setState({ userId, loading: false });
      })
      .catch((err) => {
        console.warn("Sancti web session init failed:", err);
        if (!cancelled) setState({ userId: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
};

export const useWebSession = (): SessionState => useContext(SessionContext);
