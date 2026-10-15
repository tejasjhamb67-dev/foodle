import "server-only";
import type { Edition, Mode } from "@foodle/game";
import { miniSquares, type evaluate } from "./content";
import { db } from "./supabase";
import { maxPlayableNumber } from "./today";

/** Daily results only: archive plays never reach the leaderboard (spec 10.3). */
export function isDailyNumber(n: number) {
  return n >= maxPlayableNumber() - 2;
}

export async function recordPlay(
  userId: string,
  mode: Mode,
  edition: Edition,
  number: number,
  guesses: string[],
  result: ReturnType<typeof evaluate>,
) {
  const now = new Date().toISOString();
  const { data: existing } = await db()
    .from("plays")
    .select("started_at, finished_at")
    .match({ user_id: userId, mode, edition, number })
    .maybeSingle();
  if (existing?.finished_at) return; // first finished result is final
  const started = existing?.started_at ?? now;
  await db()
    .from("plays")
    .upsert(
      {
        user_id: userId,
        mode,
        edition,
        number,
        guesses,
        squares: miniSquares(result.rows),
        clues_seen: result.clues.length,
        guess_count: result.rows.length,
        won: result.won,
        started_at: started,
        finished_at: result.finished ? now : null,
        solve_ms: result.finished ? Date.parse(now) - Date.parse(started) : null,
      },
      { onConflict: "user_id,mode,edition,number" },
    );
}
