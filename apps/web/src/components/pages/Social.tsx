"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { SOCIAL_ENABLED } from "@/lib/config";
import { useSession } from "@/lib/supabase";

export function Avatar({ name, you }: { name: string; you?: boolean }) {
  return (
    <span className={`avatar${you ? " you" : ""}`} aria-hidden>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

/** Wraps social screens: these need an account (spec 5.1). */
export function RequireSignIn({ title, children, next }: { title: string; children: ReactNode; next?: string }) {
  const { session, ready } = useSession();
  return (
    <main id="main" className="page">
      <div className="content">
        <h1 className="t-title">{title}</h1>
        {!SOCIAL_ENABLED ? (
          <p className="muted">Foodle is better with friends. Leaderboards, friends and groups arrive when accounts are switched on.</p>
        ) : !ready ? null : !session ? (
          <>
            <p className="muted">Foodle is better with friends. Sign in to see leaderboards and share your invite link.</p>
            <Link
              className="btn primary"
              href="/signin"
              onClick={() => next && sessionStorage.setItem("foodle-after-signin", next)}
            >
              Sign in
            </Link>
          </>
        ) : (
          children
        )}
      </div>
    </main>
  );
}

export function formatMs(ms: number | null | undefined) {
  if (ms == null) return "";
  const s = Math.round(ms / 1000);
  return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
