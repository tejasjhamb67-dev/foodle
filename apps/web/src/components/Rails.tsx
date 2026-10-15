"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EDITION_LABEL, EDITIONS, MODE_LABEL, MODES, type Edition, type Mode } from "@foodle/game";
import { api } from "@/lib/api";
import { SOCIAL_ENABLED } from "@/lib/config";
import { overallStreak, statsFor } from "@/lib/stats";
import { gameKey, useStore } from "@/lib/store";
import { useSession } from "@/lib/supabase";

export function StatusPill({ edition, mode, number }: { edition: Edition; mode: Mode; number: number | null }) {
  const g = useStore((s) => (number != null ? s.games[gameKey(edition, mode, number)] : undefined));
  if (!g || !g.rows.length) return <span className="pill">Not started</span>;
  if (!g.finished) return <span className="pill present">In progress</span>;
  return g.won ? <span className="pill correct">Solved in {g.rows.length}</span> : <span className="pill absent">Missed</span>;
}

const MODE_SUB: Record<Mode, string> = { dish: "Guess the dish", drink: "Guess the drink", cuisine: "Guess the cuisine" };

export function LeftRail({ edition, mode, today }: { edition: Edition; mode: Mode; today: number | null }) {
  return (
    <>
      {EDITIONS.map((e) => (
        <div key={e} className="rail-section">
          <h3 className="t-label">{EDITION_LABEL[e]} edition</h3>
          {MODES.map((m) => (
            <Link key={m} href={`/${e}/${m}`} className="mode-card" aria-current={e === edition && m === mode ? "page" : undefined}>
              <span>
                <span style={{ display: "block", fontWeight: 700 }}>{MODE_LABEL[m]}</span>
                <span className="t-meta">{m === "cuisine" && e === "india" ? "Guess the state" : MODE_SUB[m]}</span>
              </span>
              <StatusPill edition={e} mode={m} number={today} />
            </Link>
          ))}
        </div>
      ))}
    </>
  );
}

interface LbRow {
  rank: number;
  name: string;
  won: boolean;
  guesses: number;
  you: boolean;
}

export function RightRail({ edition, mode, today }: { edition: Edition; mode: Mode; today: number | null }) {
  const games = useStore((s) => s.games);
  const { session } = useSession();
  const [friends, setFriends] = useState<LbRow[] | null>(null);
  const streak = today != null ? overallStreak(games, today) : 0;
  const st = today != null ? statsFor(games, edition, mode, today) : null;

  useEffect(() => {
    if (!session || today == null) return;
    api
      .get<{ rows: LbRow[] }>(`/api/leaderboard?scope=friends&mode=${mode}&edition=${edition}&number=${today}`)
      .then((r) => setFriends(r.rows))
      .catch(() => setFriends([]));
  }, [session, mode, edition, today]);

  return (
    <>
      <div className="rail-section card">
        <h3 className="t-label">Streak</h3>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <span className="t-stat">{streak}</span>
          <span className="t-meta">{streak === 1 ? "day" : "days"} with a win, any mode</span>
        </div>
        {st && (
          <p className="t-meta" style={{ margin: "8px 0 0" }}>
            {MODE_LABEL[mode]} · {EDITION_LABEL[edition]}: {st.currentStreak} current, {st.maxStreak} best, {st.winPct}% won
          </p>
        )}
      </div>
      <div className="rail-section card">
        <h3 className="t-label">Friends today</h3>
        {!SOCIAL_ENABLED ? (
          <p className="t-meta" style={{ margin: 0 }}>Foodle is better with friends. Leaderboards arrive when accounts are switched on.</p>
        ) : !session ? (
          <p className="t-meta" style={{ margin: 0 }}>
            Foodle is better with friends. <Link href="/signin">Sign in</Link> to share your invite link.
          </p>
        ) : friends == null ? (
          <p className="t-meta">Loading…</p>
        ) : friends.length <= 1 ? (
          <p className="t-meta" style={{ margin: 0 }}>
            Foodle is better with friends. <Link href="/friends">Share your invite link.</Link>
          </p>
        ) : (
          <ol className="list">
            {friends.slice(0, 6).map((f) => (
              <li key={f.rank + f.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: f.you ? 700 : 400 }}>
                <span>
                  {f.rank}. {f.name}
                </span>
                <span className="t-meta">{f.won ? `${f.guesses}/6` : "X/6"}</span>
              </li>
            ))}
          </ol>
        )}
        <p style={{ margin: "10px 0 0" }}>
          <Link className="t-meta" href="/leaderboard">
            Full leaderboard →
          </Link>
        </p>
      </div>
    </>
  );
}
