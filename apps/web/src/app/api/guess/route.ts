import { evaluate, GuessError } from "@/server/content";
import { fail, json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";
import { isDailyNumber, recordPlay } from "@/server/record";
import { userFrom } from "@/server/supabase";
import { isPlayable } from "@/server/today";

/**
 * POST /api/guess { mode, edition, number, guesses: string[], daily?: boolean }
 * `guesses` holds every guess so far, newest last. Returns the rows, revealed clues and,
 * once finished, the answer card.
 */
export async function POST(req: Request) {
  let body: { mode?: string; edition?: string; number?: number; guesses?: unknown; daily?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "Invalid JSON");
  }
  const mode = parseMode(body.mode);
  const edition = parseEdition(body.edition);
  const number = Number(body.number);
  const guesses = Array.isArray(body.guesses) ? body.guesses.filter((g): g is string => typeof g === "string") : [];
  if (!mode || !edition) return fail(400, "bad_request", "Unknown mode or edition");
  if (!isPlayable(number)) return fail(404, "not_found", "No puzzle for that day");

  try {
    const result = evaluate(mode, edition, number, guesses);
    if (body.daily && isDailyNumber(number)) {
      const user = await userFrom(req);
      if (user) await recordPlay(user.id, mode, edition, number, guesses, result).catch(() => undefined);
    }
    const { rows, ...rest } = result;
    return json({ row: rows[rows.length - 1], rows, ...rest }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof GuessError) return fail(e.code === "bad_request" ? 400 : 422, e.code, e.message);
    throw e;
  }
}
