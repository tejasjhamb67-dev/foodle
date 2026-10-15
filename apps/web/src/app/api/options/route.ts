import { GuessError, optionsFor } from "@/server/content";
import { fail, json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";
import { isDailyNumber } from "@/server/record";
import { db, userFrom } from "@/server/supabase";
import { isPlayable } from "@/server/today";

/**
 * POST /api/options { mode, edition, number, guesses, daily? } → { options }
 * Opt-in multiple choice for the last two guesses. For signed-in daily plays the server marks
 * the play as assisted, so leaderboards can rank unassisted solves first.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = parseMode(body.mode);
  const edition = parseEdition(body.edition);
  const number = Number(body.number);
  const guesses: string[] = Array.isArray(body.guesses) ? body.guesses.filter((g: unknown) => typeof g === "string") : [];
  if (!mode || !edition) return fail(400, "bad_request", "Unknown mode or edition");
  if (!isPlayable(number)) return fail(404, "not_found", "No puzzle for that day");
  try {
    const options = optionsFor(mode, edition, number, guesses);
    if (body.daily && isDailyNumber(number)) {
      const user = await userFrom(req);
      if (user) {
        await db()
          .from("plays")
          .upsert({ user_id: user.id, mode, edition, number, assisted: true }, { onConflict: "user_id,mode,edition,number" })
          .then(undefined, () => undefined);
      }
    }
    return json({ options }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof GuessError) return fail(e.code === "bad_request" ? 400 : 422, e.code, e.message);
    throw e;
  }
}
