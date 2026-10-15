"use client";
import { useEffect, useState } from "react";
import { EDITION_LABEL, EDITIONS, MODE_LABEL, MODES, type Edition, type Mode } from "@foodle/game";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/today";
import { Avatar, formatMs, RequireSignIn } from "./Social";

interface Row {
  rank: number;
  user_id: string;
  name: string;
  won?: boolean;
  guesses?: number;
  solve_ms?: number | null;
  squares?: string[];
  points?: number;
  assisted?: boolean;
  you: boolean;
}
type Scope = "friends" | "group" | "global";

export function LeaderboardRows({ rows, weekly }: { rows: Row[]; weekly?: boolean }) {
  if (!rows.length) return <p className="muted">No results yet today.</p>;
  return (
    <ol className="list">
      {rows.map((r) => (
        <li key={r.user_id} className={`lb-row${r.you ? " you" : ""}`}>
          <span className="t-headline" style={{ textAlign: "center" }}>
            {r.rank}
          </span>
          <Avatar name={r.name} you={r.you} />
          <span>
            <span style={{ fontWeight: 700 }}>{r.you ? `${r.name} (you)` : r.name}</span>
            {weekly ? (
              <span className="t-meta" style={{ display: "block" }}>
                {r.points} points this week
              </span>
            ) : (
              <>
                <span className="t-meta" style={{ display: "block" }}>
                  {r.won ? `Solved in ${r.guesses}${r.assisted ? " · with options" : ""}` : "Missed"}
                </span>
                <span className="minis" aria-hidden>
                  {(r.squares ?? []).map((s, i) => (
                    <i key={i} className={s} />
                  ))}
                </span>
              </>
            )}
          </span>
          <span className="t-meta">{weekly ? "" : formatMs(r.solve_ms)}</span>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardPage() {
  const today = useToday();
  const last = useStore((s) => s.last);
  const [scope, setScope] = useState<Scope>("friends");
  const [edition, setEdition] = useState<Edition>(last?.edition ?? "global");
  const [mode, setMode] = useState<Mode>(last?.mode ?? "dish");
  const [groups, setGroups] = useState<{ id: string; name: string }[] | null>(null);
  const [group, setGroup] = useState("");
  const [period, setPeriod] = useState<"today" | "week">("today");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (scope !== "group" || groups) return;
    api
      .get<{ groups: { id: string; name: string }[] }>("/api/groups")
      .then((g) => {
        setGroups(g.groups);
        if (g.groups[0]) setGroup(g.groups[0].id);
      })
      .catch(() => setGroups([]));
  }, [scope, groups]);

  useEffect(() => {
    if (today == null) return;
    if (scope === "group" && !group) return setRows([]);
    setRows(null);
    setError("");
    const q = new URLSearchParams({ scope, mode, edition, number: String(today) });
    if (scope === "group") {
      q.set("group", group);
      if (period === "week") q.set("period", "week");
    }
    api
      .get<{ rows: Row[] }>(`/api/leaderboard?${q}`)
      .then((r) => setRows(r.rows))
      .catch((e) => setError(e.message));
  }, [scope, mode, edition, today, group, period]);

  return (
    <RequireSignIn title="Leaderboard" next="/leaderboard">
      <div className="segmented" role="tablist" aria-label="Scope" style={{ marginBottom: 8 }}>
        {(["friends", "group", "global"] as Scope[]).map((s) => (
          <button key={s} role="tab" aria-selected={s === scope} onClick={() => setScope(s)}>
            {s === "friends" ? "Friends" : s === "group" ? "Groups" : "Global"}
          </button>
        ))}
      </div>
      <div className="switches" style={{ paddingTop: 0 }}>
        <div className="segmented modes" role="tablist" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m} role="tab" aria-selected={m === mode} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="segmented editions" role="tablist" aria-label="Edition">
          {EDITIONS.map((e) => (
            <button key={e} role="tab" aria-selected={e === edition} onClick={() => setEdition(e)}>
              {EDITION_LABEL[e]}
            </button>
          ))}
        </div>
      </div>
      {scope === "group" && groups && groups.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <select className="text-input" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group" style={{ flex: 1 }}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="segmented" role="tablist" aria-label="Period" style={{ minWidth: 180 }}>
            <button role="tab" aria-selected={period === "today"} onClick={() => setPeriod("today")}>
              Today
            </button>
            <button role="tab" aria-selected={period === "week"} onClick={() => setPeriod("week")}>
              This week
            </button>
          </div>
        </div>
      )}
      <p className="t-meta" style={{ margin: "14px 0" }}>
        {scope === "global" ? "Today's top 100, plus your own rank. " : ""}Solved first, then fewer guesses, then faster time.
      </p>
      {scope === "group" && groups?.length === 0 ? (
        <p className="muted">
          You&rsquo;re not in a group yet. <a href="/friends">Create or join one.</a>
        </p>
      ) : error ? (
        <p className="banner">{error}</p>
      ) : rows == null ? (
        <p className="muted">Loading…</p>
      ) : (
        <LeaderboardRows rows={rows} weekly={scope === "group" && period === "week"} />
      )}
    </RequireSignIn>
  );
}
