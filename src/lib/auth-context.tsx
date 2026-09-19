"use client";

// ---------------------------------------------------------------------
// Auth context — session state for the whole app.
//
// Works in both modes: Supabase (real auth) and demo (localStorage).
// The session is loaded asynchronously in an effect, so the first render
// always shows "loading" and there is no hydration mismatch between the
// server-rendered shell and the client.
// ---------------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Role } from "./model";
import * as data from "./data";

export type AuthStatus = "loading" | "guest" | "authed";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  verificationStatus: "unverified" | "pending" | "verified";
  companyId?: string | null;
  phone?: string;
  city?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: { fullName: string; email: string; password: string; role: Role }) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  /** Re-reads the session from the backend (e.g. after verifying/company setup). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const load = useCallback(async () => {
    const session = await data.getSession();
    if (session) {
      setUser({
        id: session.id,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        verificationStatus: session.verificationStatus,
        companyId: session.companyId,
        phone: session.phone,
        city: session.city,
      });
      setStatus("authed");
    } else {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    // Defer the first session read so the loading state is set after paint.
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await data.signIn(email, password);
    if (res.ok) await load();
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  }, [load]);

  const signUp = useCallback(async (input: { fullName: string; email: string; password: string; role: Role }) => {
    const res = await data.signUp(input);
    if (res.ok) await load();
    return { ok: res.ok, error: res.ok ? undefined : res.error };
  }, [load]);

  const signOut = useCallback(async () => {
    await data.signOut();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut, refresh: load }),
    [status, user, signIn, signUp, signOut, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Convenience: true while the initial session check is in flight. */
export function useAuthLoading(): boolean {
  return useAuth().status === "loading";
}