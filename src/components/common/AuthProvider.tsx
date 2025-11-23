"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { persistUserId } from "@/lib/userId";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  isPromptOpen: boolean;
  openAuthPrompt: (reason?: AuthPromptReason) => void;
  closeAuthPrompt: () => void;
  signInWithGoogle: () => Promise<void>;
  continueWithoutAuth: () => void;
  requireAuthForSatellite: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthPromptReason = "initial" | "action";

interface AuthProviderProps {
  children: ReactNode;
}

function AuthPrompt({
  open,
  onSignIn,
  onContinue,
  reason,
}: {
  open: boolean;
  onSignIn: () => void;
  onContinue: () => void;
  reason: AuthPromptReason;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-900/95 shadow-2xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-amber-200">Sign in to personalize your orbit</h2>
        <p className="mt-3 text-sm text-slate-300/90">
          {reason === "initial"
            ? "Connect with Google to save your satellite and sync your experience across visits."
            : "You need to sign in with Google before creating your satellite."}
        </p>
        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={onSignIn}
            className="w-full rounded-full bg-white text-slate-900 font-semibold py-3 shadow-lg hover:shadow-xl transition">
            Sign in with Google
          </button>
          {reason === "initial" && (
            <button
              type="button"
              onClick={onContinue}
              className="w-full rounded-full border border-slate-600 text-slate-300 py-3 hover:bg-slate-800 transition"
            >
              Continue without signing in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SupabaseAuthProvider({ children }: AuthProviderProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [promptReason, setPromptReason] = useState<AuthPromptReason>("initial");
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentSession = data?.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setStatus(currentSession ? "authenticated" : "unauthenticated");
      if (currentSession?.user?.id) {
        persistUserId(currentSession.user.id);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setSession(authSession);
      setUser(authSession?.user ?? null);
      setStatus(authSession ? "authenticated" : "unauthenticated");
      if (authSession) {
        setIsPromptOpen(false);
        sessionStorage.removeItem("postAuthAction");
        if (authSession.user?.id) {
          persistUserId(authSession.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription?.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    const origin = window.location.origin;
    const currentPath = window.location.pathname + window.location.search;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("Failed to start Google sign-in", error);
      throw error;
    }
  }, [supabase]);

  const continueWithoutAuth = useCallback(() => {
    setIsPromptOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      setSession(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [supabase]);

  const openAuthPrompt = useCallback((reason: AuthPromptReason = "action") => {
    setPromptReason(reason);
    setIsPromptOpen(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setIsPromptOpen(false);
  }, []);

  const requireAuthForSatellite = useCallback(async () => {
    if (session) return true;
    sessionStorage.setItem("postAuthAction", "open-profile");
    setPromptReason("action");
    setIsPromptOpen(true);
    return false;
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    status,
    isPromptOpen,
    openAuthPrompt,
    closeAuthPrompt,
    signInWithGoogle,
    continueWithoutAuth,
    requireAuthForSatellite,
    signOut,
  }), [session, user, status, isPromptOpen, openAuthPrompt, closeAuthPrompt, signInWithGoogle, continueWithoutAuth, requireAuthForSatellite, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthPrompt
        open={isPromptOpen}
        reason={promptReason}
        onSignIn={() => {
          signInWithGoogle().catch(() => {
            // Prompt remains visible if sign-in fails
          });
        }}
        onContinue={continueWithoutAuth}
      />
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}
