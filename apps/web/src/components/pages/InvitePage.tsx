"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { SOCIAL_ENABLED } from "@/lib/config";
import { useSession } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { Wordmark } from "../Wordmark";

/** Deep link: adds a friend or joins a group after sign-in (spec 5.1). */
export function InvitePage({ code, kind }: { code: string; kind: "friend" | "group" }) {
  const { session, ready } = useSession();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const accept = async () => {
    try {
      if (kind === "group") {
        const g = await api.post<{ id: string; name: string }>("/api/groups/join", { code });
        track("invite_accepted", { kind });
        router.push(`/groups/${g.id}`);
      } else {
        const r = await api.post<{ status: string; name: string }>("/api/friends", { code });
        track("invite_accepted", { kind });
        setMsg(r.status === "accepted" ? `You and ${r.name} are now friends.` : `Friend request sent to ${r.name}.`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <main id="main" className="page">
      <div className="content" style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ margin: "24px 0" }}>
          <Wordmark size={40} href={null} />
        </div>
        <h1 className="t-title">{kind === "group" ? "You're invited to a group" : "You're invited to play"}</h1>
        <p className="muted">Foodle is a daily food guessing game. Guess the dish in six tries; every miss reveals an ingredient.</p>
        {!SOCIAL_ENABLED ? (
          <Link className="btn primary" href="/">
            Play today&rsquo;s Foodle
          </Link>
        ) : !ready ? null : !session ? (
          <div style={{ display: "grid", gap: 10 }}>
            <Link className="btn primary block" href="/signin" onClick={() => sessionStorage.setItem("foodle-after-signin", `/invite/${code}?k=${kind === "group" ? "g" : "f"}`)}>
              Sign in to accept
            </Link>
            <Link className="btn ghost block" href="/">
              Just play
            </Link>
          </div>
        ) : msg ? (
          <>
            <p>{msg}</p>
            <Link className="btn primary" href="/">
              Play today&rsquo;s Foodle
            </Link>
          </>
        ) : (
          <button className="btn primary block" onClick={accept}>
            {kind === "group" ? "Join group" : "Add friend"}
          </button>
        )}
      </div>
    </main>
  );
}
