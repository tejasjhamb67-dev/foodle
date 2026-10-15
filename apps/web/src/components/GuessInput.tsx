"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { exactMatch, normalize, search, type Indexed } from "@foodle/game";

function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  const n = normalize(text);
  const at = q ? n.indexOf(q) : -1;
  // normalize() can change length (accents, &), so only highlight when it maps 1:1.
  if (at < 0 || n.length !== text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

export function GuessInput({
  list,
  placeholder,
  guessed,
  disabled,
  onGuess,
  onReject,
  autoFocus,
}: {
  list: Indexed[] | null;
  placeholder: string;
  guessed: Set<string>;
  disabled: boolean;
  onGuess: (o: Indexed, via: "tap" | "enter") => void;
  onReject: (reason: "not_in_list" | "repeat") => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  // Spec: max 5 rows, already-guessed items left out.
  const results = useMemo(() => (list && q ? search(list, q, guessed, 5) : []), [list, q, guessed]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    if (autoFocus && !disabled && window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, [autoFocus, disabled]);

  const reject = (reason: "not_in_list" | "repeat") => {
    setShake(true);
    onReject(reason);
  };

  const submit = (via: "tap" | "enter", o?: Indexed) => {
    if (disabled || !list) return;
    let pick = o ?? (open && results.length ? results[sel] : undefined);
    if (!pick) {
      const exact = exactMatch(list, q);
      if (exact && guessed.has(exact.id)) return reject("repeat");
      pick = exact;
    }
    if (!pick) return reject("not_in_list");
    if (guessed.has(pick.id)) return reject("repeat");
    onGuess(pick, via);
    setQ("");
    setOpen(false);
  };

  const showList = open && results.length > 0;
  return (
    <div className="guess-dock">
      <div className="guess-dock-inner">
        {showList && (
          <ul className="ac" role="listbox" id={`${id}-list`} aria-label="Suggestions">
            {results.map((o, i) => (
              <li
                key={o.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === sel}
                onMouseEnter={() => setSel(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit("tap", o);
                }}
              >
                <span className="name">
                  <Highlight text={o.name} query={q} />
                </span>
                <span className="meta">{o.meta}</span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit("enter");
          }}
        >
          <input
            ref={input}
            className={`guess-input${shake ? " shake" : ""}`}
            value={q}
            disabled={disabled}
            placeholder={list ? placeholder : "Loading…"}
            aria-label={placeholder.replace("…", "")}
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${id}-opt-${sel}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onAnimationEnd={() => setShake(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && results.length) {
                e.preventDefault();
                setOpen(true);
                setSel((s) => (s + 1) % results.length);
              } else if (e.key === "ArrowUp" && results.length) {
                e.preventDefault();
                setSel((s) => (s - 1 + results.length) % results.length);
              } else if (e.key === "Escape") {
                if (open && results.length) setOpen(false);
                else setQ("");
              }
            }}
          />
          <button className="btn primary sm guess-btn" type="submit" disabled={disabled || !q.trim()}>
            Guess
          </button>
        </form>
        <p className="kbd-hint t-meta">Type to search · ↑ ↓ to choose · Enter to guess · Esc to close</p>
      </div>
    </div>
  );
}
