"use client";
import type { GuessRow, TileState } from "@foodle/game";

const GLYPH: Record<TileState, string> = { correct: "✓", present: "~", absent: "×" };

export function Board({
  columns,
  rows,
  animateFrom,
  won,
}: {
  columns: { key: string; label: string }[];
  rows: GuessRow[];
  /** Rows at or after this index flip in; earlier rows render settled. */
  animateFrom: number;
  won: boolean;
}) {
  const cols = columns.length;
  const flipTotal = cols * 120 + 300;
  return (
    <section className="board" aria-label="Guesses" style={{ ["--cols" as string]: cols }}>
      <div className="colheads" aria-hidden>
        {columns.map((c) => (
          <span key={c.key} className="t-label">
            {c.label}
          </span>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, r) => {
        const row = rows[r];
        if (!row) {
          return (
            <div key={r} className="row empty" aria-hidden>
              <div className="empty-row" />
            </div>
          );
        }
        const animate = r >= animateFrom;
        const bounce = won && row.correct && animate;
        return (
          <div key={r} className="row" role="group" aria-label={`Guess ${r + 1}: ${row.name}. ${row.tiles.map((t) => t.a11y).join(". ")}`}>
            <div className="row-name" aria-hidden>
              {row.name}
            </div>
            <div className="tiles" aria-hidden>
              {row.tiles.map((t, i) => (
                <div
                  key={t.key}
                  className={`tile ${t.state}${animate ? (bounce ? " flip-bounce" : " flip") : ""}`}
                  style={{ ["--i" as string]: i, ["--bounce-start" as string]: `${flipTotal}ms` }}
                  title={t.a11y}
                >
                  <span className="glyph">{GLYPH[t.state]}</span>
                  <span>{t.value}</span>
                  {t.sub && <span className="sub">{t.sub}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
