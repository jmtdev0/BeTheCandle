"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const next = searchParams.get("next") ?? "/lobby";

    if (error) {
      console.error("OAuth callback error", error);
      router.replace(next);
      return;
    }

    if (!code) {
      router.replace(next);
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          console.error("Failed to exchange auth code", exchangeError);
        }
        router.replace(next);
      })
      .catch((exchangeErr) => {
        console.error("Unexpected auth exchange failure", exchangeErr);
        router.replace(next);
      });
  }, [router, searchParams, supabase]);

  return <LoadingState />;
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="text-center space-y-3">
        <h1 className="text-xl font-semibold">Connecting your orbit…</h1>
        <p className="text-sm text-slate-400">Finalizing Google sign-in. This won&apos;t take long.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CallbackHandler />
    </Suspense>
  );
}
