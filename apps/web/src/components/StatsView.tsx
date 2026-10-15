"use client";
import { useState } from "react";
import { EDITION_LABEL, EDITIONS, MODE_LABEL, MODES, type Edition, type Mode } from "@foodle/game";
import { statsFor } from "@/lib/stats";
import { gameKey, useStore } from "@/lib/store";

export function StatsView({ edition: e0, mode: m0, today }: { edition: Edition; mode: Mode; today: number }) {
  const [edition, setEdition] = useState(e0);
  const [mode, setMode] = useState(m0);
  const games = useStore((s) => s.games);
  const st = statsFor(games, edition, mode, today);
  const todayGame = games[gameKey(edition, mode, today)];
  const todayIdx = todayGame?.finished && todayGame.daily ? (todayGame.won ? todayGame.rows.length - 1 : 6) : -1;
  const max = Math.max(1, ...st.distribution);
  return (
    <div>
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
      <div className="stat-tiles">
        {[
          [st.played, "Played"],
          [st.winPct, "Win %"],
          [st.currentStreak, "Current streak"],
          [st.maxStreak, "Max streak"],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="t-stat">{n}</div>
            <div className="t-meta">{l}</div>
          </div>
        ))}
      </div>
      <h3 className="t-label" style={{ marginBottom: 10 }}>
        Guess distribution
      </h3>
      <div className="dist">
        {st.distribution.map((n, i) => (
          <div key={i} className="dist-row">
            <span>{i === 6 ? "X" : i + 1}</span>
            <div className={`dist-bar${i === todayIdx ? " today" : ""}`} style={{ width: `${Math.max(8, (n / max) * 100)}%` }}>
              {n}
            </div>
          </div>
        ))}
      </div>
      <p className="t-meta" style={{ marginTop: 16 }}>
        Daily puzzles only. Archive plays don&rsquo;t count.
      </p>
    </div>
  );
}
