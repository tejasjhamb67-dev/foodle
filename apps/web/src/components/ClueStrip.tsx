"use client";
import { useEffect, useRef, useState } from "react";

/** Spec 4: "CLUES  k of n", chips wrap; locked clues show their number only. */
export function ClueStrip({ clues, total, delayNew }: { clues: string[]; total: number; delayNew: number }) {
  const seen = useRef(clues.length);
  const [fresh, setFresh] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (clues.length > seen.current) {
      setFresh(seen.current);
      setAnnounce(`Clue ${clues.length} of ${total}: ${clues[clues.length - 1]}`);
    }
    seen.current = clues.length;
  }, [clues, total]);
  return (
    <section className="clues" aria-label="Clues">
      <div className="clues-head">
        <span className="t-label">Clues</span>
        <span className="t-label">
          {clues.length} of {total}
        </span>
      </div>
      <ol className="chips" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {Array.from({ length: total }, (_, i) =>
          i < clues.length ? (
            <li
              key={i}
              className={`chip${fresh != null && i >= fresh ? " new" : ""}`}
              style={{ ["--chip-delay" as string]: `${delayNew}ms` }}
            >
              <span className="n">{i + 1}</span>
              {clues[i]}
            </li>
          ) : (
            <li key={i} className="chip locked" aria-label={`Clue ${i + 1}, locked`}>
              <span className="n">{i + 1}</span>
            </li>
          ),
        )}
      </ol>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </section>
  );
}
