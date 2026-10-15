import { evaluate, GuessError } from "@/server/content";
import { withUser } from "@/server/guard";
import { json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";
import { isDailyNumber, recordPlay } from "@/server/record";
import { ensureProfile } from "@/server/social";
import { isPlayable } from "@/server/today";

/**
 * POST /api/sync { plays: [{ mode, edition, number, guesses }] }
 * Called after sign-in: replays the guest's recent daily boards through the same rules,
 * so results attach to the account without trusting the client.
 */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    await ensureProfile(user);
    const body = await req.json().catch(() => ({}));
    const plays: unknown[] = Array.isArray(body.plays) ? body.plays.slice(0, 20) : [];
    let synced = 0;
    for (const p of plays as { mode?: string; edition?: string; number?: number; guesses?: string[] }[]) {
      const mode = parseMode(p.mode);
      const edition = parseEdition(p.edition);
      const number = Number(p.number);
      if (!mode || !edition || !isPlayable(number) || !isDailyNumber(number) || !Array.isArray(p.guesses)) continue;
      try {
        const result = evaluate(mode, edition, number, p.guesses);
        if (!result.finished) continue;
        await recordPlay(user.id, mode, edition, number, p.guesses, result);
        synced++;
      } catch (e) {
        if (!(e instanceof GuessError)) throw e;
      }
    }
    return json({ synced });
  });
