"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  columnsFor,
  dateForNumber,
  EDITION_LABEL,
  MAX_GUESSES,
  notInListCopy,
  placeholderFor,
  verdict,
  type Edition,
  type GuessOption,
  type Mode,
} from "@foodle/game";
import { api, ApiError } from "@/lib/api";
import { LAUNCH_DATE, SOCIAL_ENABLED } from "@/lib/config";
import { useGuessList } from "@/lib/guessList";
import { share } from "@/lib/share";
import { overallStreak } from "@/lib/stats";
import { gameKey, useHydrated, useStore, type GameState } from "@/lib/store";
import { useSession } from "@/lib/supabase";
import { useToday } from "@/lib/today";
import { useUi } from "@/lib/ui";
import { track } from "@/lib/analytics";
import { AnswerCard } from "./AnswerCard";
import { Board } from "./Board";
import { ClueStrip } from "./ClueStrip";
import { GuessInput } from "./GuessInput";
import { ModeSwitch } from "./ModeSwitch";
import { LeftRail, RightRail } from "./Rails";
import { OptionsPanel, OPTIONS_AFTER } from "./OptionsPanel";

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function Game({ edition, mode, archiveNumber }: { edition: Edition; mode: Mode; archiveNumber?: number }) {
  const today = useToday();
  const hydrated = useHydrated();
  const number = archiveNumber ?? today;
  const ready = hydrated && number != null;
  const key = number != null ? gameKey(edition, mode, number) : "";
  const game = useStore((s) => (key ? s.games[key] : undefined));
  const saveGame = useStore((s) => s.saveGame);
  const setLast = useStore((s) => s.setLast);
  const highContrast = useStore((s) => s.settings.highContrast);
  const games = useStore((s) => s.games);
  const toast = useUi((s) => s.toast);
  const openModal = useUi((s) => s.open);
  const online = useOnline();
  const { session } = useSession();

  const [intro, setIntro] = useState<{ clues: string[]; clueCount: number; version: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [animateFrom, setAnimateFrom] = useState(99);
  const [showAnswer, setShowAnswer] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const viewed = useRef<string>("");

  const columns = useMemo(() => columnsFor(mode, edition), [mode, edition]);
  const list = useGuessList(mode, edition, intro?.version);
  const isDaily = archiveNumber == null || archiveNumber === today;

  useEffect(() => {
    if (archiveNumber == null) setLast(edition, mode);
  }, [edition, mode, archiveNumber, setLast]);

  // Fetch the first clue unless we already have a saved board.
  useEffect(() => {
    if (!ready || number == null) return;
    setIntro(null);
    setLoadError(null);
    setAnimateFrom(99);
    setShowAnswer(true);
    if (viewed.current !== key) {
      viewed.current = key;
      track(archiveNumber != null ? "archive_play" : "puzzle_view", { mode, edition, number });
    }
    if (useStore.getState().games[key]) return;
    let cancelled = false;
    api
      .puzzle(mode, edition, number, isDaily)
      .then((p) => !cancelled && setIntro({ clues: p.clues, clueCount: p.clueCount, version: p.guessListVersion }))
      .catch((e: ApiError) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  const rows = game?.rows ?? [];
  const clues = game?.clues ?? intro?.clues ?? [];
  const clueCount = game?.clueCount ?? intro?.clueCount ?? 0;
  const finished = game?.finished ?? false;
  const guessed = useMemo(() => new Set(rows.map((r) => r.guessId)), [rows]);
  const flipMs = columns.length * 120 + 300;

  const onGuess = useCallback(
    async (o: GuessOption, via: "tap" | "enter" | "option") => {
      if (number == null || busy) return;
      const prev = useStore.getState().games[key];
      const ids = [...(prev?.rows.map((r) => r.guessId) ?? []), o.id];
      setBusy(true);
      try {
        const res = await api.guess(mode, edition, number, ids, isDaily && (prev?.daily ?? true));
        const next: GameState = {
          mode,
          edition,
          number,
          rows: res.rows,
          clues: res.clues,
          clueCount: res.clueCount,
          finished: res.finished,
          won: res.won,
          answer: res.answer,
          daily: prev?.daily ?? isDaily,
          startedAt: prev?.startedAt ?? Date.now(),
          finishedAt: res.finished ? Date.now() : undefined,
          assisted: prev?.assisted,
          options: prev?.options?.filter((x) => x.id !== o.id),
        };
        setAnimateFrom(ids.length - 1);
        saveGame(next);
        track("guess_submit", { mode, edition, number, guess_no: ids.length, correct: res.won, via });
        if (!res.finished && res.clues.length > (prev?.clues.length ?? clues.length)) {
          track("clue_reveal", { mode, edition, number, clue_no: res.clues.length });
        }
        if (res.finished) {
          setShowAnswer(false);
          const solveMs = Date.now() - next.startedAt;
          track("puzzle_end", { won: res.won, guesses: ids.length, solve_ms: solveMs });
          setTimeout(
            () => {
              if (res.won) toast(verdict(true, ids.length));
              setShowAnswer(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
              const streak = overallStreak(useStore.getState().games, today ?? number);
              const seen = useStore.getState().signInPromptSeen;
              if (SOCIAL_ENABLED && !session && next.daily && (seen === 0 || (streak >= 3 && seen < 3))) setShowPrompt(true);
            },
            flipMs + (res.won ? 900 : 400),
          );
        }
      } catch (e) {
        const err = e as ApiError;
        if (err.code === "repeat") toast("Already guessed");
        else if (err.code === "not_in_list") toast(notInListCopy(mode, edition));
        else toast(err.message);
      } finally {
        setBusy(false);
      }
    },
    [number, busy, key, mode, edition, isDaily, saveGame, toast, clues.length, flipMs, today, session],
  );

  // Opt-in multiple choice for the last two guesses.
  const openOptions = async () => {
    if (!game || number == null || busy) return;
    setBusy(true);
    try {
      const res = await api.options(mode, edition, number, game.rows.map((r) => r.guessId), game.daily);
      saveGame({ ...game, assisted: true, options: res.options });
      track("options_open", { mode, edition, number, guess_no: game.rows.length + 1 });
    } catch (e) {
      toast((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    if (!game || number == null) return;
    const res = await share({
      number,
      edition,
      mode,
      rows: game.rows.map((r) => r.tiles.map((t) => t.state)),
      won: game.won,
      streak: overallStreak(games, today ?? number),
      highContrast,
      assisted: game.assisted,
    });
    if (res === "clipboard") toast("Copied to clipboard");
    if (res !== "cancelled") track("share", { channel: res, mode });
  };

  const dismissPrompt = () => {
    useStore.getState().setSignInPromptSeen(Math.max(1, overallStreak(useStore.getState().games, today ?? 0)));
    setShowPrompt(false);
  };

  const date = number != null ? dateForNumber(number, LAUNCH_DATE) : "";

  return (
    <div className="page">
      <div className="play-layout">
        <aside className="rail" aria-label="Modes">
          <LeftRail edition={edition} mode={mode} today={today} />
        </aside>
        <main className="board-col" id="main">
          {!online && <div className="offline">You&rsquo;re offline. Your board is saved.</div>}
          {archiveNumber == null ? (
            <ModeSwitch edition={edition} mode={mode} />
          ) : (
            <p style={{ marginTop: 16 }}>
              <Link href={`/archive?edition=${edition}&mode=${mode}`} className="t-meta">
                ← Back to the archive
              </Link>
            </p>
          )}
          <div className="puzzle-line">
            <span className="t-headline">No. {number ?? "…"}</span>
            <span className="t-meta">
              {date && formatDate(date)} · {EDITION_LABEL[edition]} edition{archiveNumber != null ? " · Archive" : ""}
            </span>
          </div>

          {!ready || (!game && !intro && !loadError) ? (
            <BoardSkeleton cols={columns.length} />
          ) : loadError && !game ? (
            <div className="banner">
              {loadError}. <button className="btn ghost" onClick={() => location.reload()}>Try again</button>
            </div>
          ) : finished && showAnswer && game?.answer ? (
            <>
              <AnswerCard
                answer={game.answer}
                mode={mode}
                won={game.won}
                guesses={game.rows.length}
                daily={game.daily}
                assisted={game.assisted}
                onShare={onShare}
                onStats={() => openModal("stats")}
              />
              {showPrompt && (
                <div className="banner" role="dialog" aria-label="Save your streak">
                  <p style={{ margin: "0 0 10px" }}>Save your streak? Sign in to keep it on every device.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link className="btn primary sm" href="/signin" onClick={dismissPrompt}>
                      Sign in
                    </Link>
                    <button className="btn ghost sm" onClick={dismissPrompt}>
                      Not now
                    </button>
                  </div>
                </div>
              )}
              <details style={{ marginTop: 8 }}>
                <summary className="t-label" style={{ cursor: "pointer", padding: "8px 0" }}>
                  Your board
                </summary>
                <ClueStrip clues={game.clues} total={game.clueCount} delayNew={0} />
                <Board columns={columns} rows={game.rows} animateFrom={99} won={game.won} />
              </details>
            </>
          ) : (
            <div className={finished && !game?.won ? "faded" : undefined}>
              <ClueStrip clues={clues} total={clueCount} delayNew={animateFrom < 99 ? flipMs : 0} />
              <Board columns={columns} rows={rows} animateFrom={animateFrom} won={game?.won ?? false} />
              {!finished && (
                <>
                  <GuessInput
                    list={list}
                    placeholder={placeholderFor(mode, edition)}
                    guessed={guessed}
                    disabled={busy || rows.length >= MAX_GUESSES}
                    onGuess={onGuess}
                    onReject={(reason) => {
                      toast(reason === "repeat" ? "Already guessed" : notInListCopy(mode, edition));
                      track("guess_rejected", { reason });
                    }}
                    autoFocus
                  />
                  {rows.length >= OPTIONS_AFTER && game && (
                    <OptionsPanel
                      game={game}
                      busy={busy}
                      onOpen={openOptions}
                      onPick={(o) => onGuess(o, "option")}
                    />
                  )}
                  {rows.length < OPTIONS_AFTER && (
                    <p className="t-meta" style={{ textAlign: "center", marginTop: 12 }}>
                      {MAX_GUESSES - rows.length} {MAX_GUESSES - rows.length === 1 ? "guess" : "guesses"} left
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <p className="t-meta" style={{ marginTop: 24 }}>
            <Link href={`/archive?edition=${edition}&mode=${mode}`}>Play past puzzles</Link>
          </p>
        </main>
        <aside className="rail" aria-label="Streak and friends">
          <RightRail edition={edition} mode={mode} today={today} />
        </aside>
      </div>
    </div>
  );
}

function BoardSkeleton({ cols }: { cols: number }) {
  return (
    <div aria-busy="true" aria-label="Loading puzzle">
      <div className="clues">
        <div className="clues-head">
          <span className="t-label">Clues</span>
        </div>
        <div className="chips">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="chip locked">
              <span className="n">{i + 1}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="board" style={{ ["--cols" as string]: cols }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="row empty">
            <div className="empty-row" />
          </div>
        ))}
      </div>
    </div>
  );
}
