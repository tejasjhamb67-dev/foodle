"use client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { SOCIAL_ENABLED, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let client: Promise<SupabaseClient> | null = null;

/** Loaded on demand so guests who never sign in don't download the auth client up front. */
export function supabase(): Promise<SupabaseClient> | null {
  if (!SOCIAL_ENABLED) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true },
    }),
  );
  return client;
}

export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!SOCIAL_ENABLED);
  useEffect(() => {
    const p = supabase();
    if (!p) return;
    let unsub: (() => void) | undefined;
    let alive = true;
    p.then((sb) => {
      if (!alive) return;
      sb.auth.getSession().then(({ data }) => {
        if (!alive) return;
        setSession(data.session);
        setReady(true);
      });
      const { data } = sb.auth.onAuthStateChange((_e, s) => alive && setSession(s));
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, []);
  return { session, ready };
}

export async function accessToken(): Promise<string | null> {
  const p = supabase();
  if (!p) return null;
  const { data } = await (await p).auth.getSession();
  return data.session?.access_token ?? null;
}
