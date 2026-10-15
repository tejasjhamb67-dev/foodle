"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

/** Finishes sign-in, then attaches recent guest boards to the account (spec 6: migrated on sign-in). */
export function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const p = supabase();
    if (!p) return router.replace("/");
    let unsub: (() => void) | undefined;
    const done = async () => {
      const games = Object.values(useStore.getState().games)
        .filter((g) => g.daily && g.finished)
        .sort((a, b) => b.number - a.number)
        .slice(0, 20)
        .map((g) => ({ mode: g.mode, edition: g.edition, number: g.number, guesses: g.rows.map((r) => r.guessId) }));
      await api.post("/api/sync", { plays: games }).catch(() => undefined);
      const back = sessionStorage.getItem("foodle-after-signin");
      sessionStorage.removeItem("foodle-after-signin");
      router.replace(back ?? "/");
    };
    let fired = false;
    p.then((sb) => {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (fired || !session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return;
        fired = true;
        done();
      });
      unsub = () => data.subscription.unsubscribe();
    });
    const t = setTimeout(() => setMsg("This link may have expired. Try signing in again."), 8000);
    return () => {
      unsub?.();
      clearTimeout(t);
    };
  }, [router]);
  return (
    <main id="main" className="page">
      <div className="content">
        <p>{msg}</p>
      </div>
    </main>
  );
}
