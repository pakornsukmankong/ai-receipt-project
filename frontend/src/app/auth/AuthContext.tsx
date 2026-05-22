"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getSupabase } from "../lib/supabase";
import type { User, Session, AuthError, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ data: unknown; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, updatedSession: Session | null) => {
        setSession(updatedSession);
        setUser(updatedSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (session?.access_token) {
      return session.access_token;
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      return null;
    }
    return data.session.access_token;
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
