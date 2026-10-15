"use client";
import { ListChecks } from "lucide-react";
import { MAX_GUESSES, type GuessOption } from "@foodle/game";
import type { GameState } from "@/lib/store";

/** Mirrors OPTIONS_AFTER on the server: options open for the last two guesses. */
export const OPTIONS_AFTER = MAX_GUESSES - 2;

/**
 * Opt-in help for the last two guesses: switch to multiple choice. Four options, one of them the
 * answer; a wrong pick drops out, so the final guess is one of three. Typing still works.
 */
export function OptionsPanel({
  game,
  busy,
  onOpen,
  onPick,
}: {
  game: GameState;
  busy: boolean;
  onOpen: () => void;
  onPick: (o: GuessOption) => void;
}) {
  const left = MAX_GUESSES - game.rows.length;
  if (!game.options) {
    return (
      <section className="options-card" aria-label="Options">
        <div>
          <p className="t-headline" style={{ margin: 0 }}>
            {left === 1 ? "Last guess" : `${left} guesses left`}
          </p>
          <p className="t-meta" style={{ margin: "2px 0 0" }}>
            Stuck? Switch to four options. Your result will say &ldquo;with options&rdquo;.
          </p>
        </div>
        <button className="btn secondary sm" onClick={onOpen} disabled={busy}>
          <ListChecks size={20} strokeWidth={2} /> Show options
        </button>
      </section>
    );
  }
  return (
    <section className="options-card open" aria-label="Pick an option">
      <p className="t-label" style={{ margin: 0 }}>
        Pick one, or keep typing
      </p>
      <div className="options-grid">
        {game.options.map((o) => (
          <button key={o.id} className="option-btn" onClick={() => onPick(o)} disabled={busy}>
            <span className="name">{o.name}</span>
            <span className="t-meta">{o.meta}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
