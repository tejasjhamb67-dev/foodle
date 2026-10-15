import { puzzleNumber, isIsoDate } from "@foodle/game";
import { LAUNCH_DATE } from "@/lib/config";
import { puzzleInfo } from "@/server/content";
import { fail, json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";
import { db, userFrom } from "@/server/supabase";
import { isPlayable } from "@/server/today";

/** GET /api/puzzle?mode&edition&(date|number) → number, first clue, clue count, guess-list version */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const mode = parseMode(q.get("mode"));
  const edition = parseEdition(q.get("edition"));
  if (!mode || !edition) return fail(400, "bad_request", "Unknown mode or edition");
  let number = Number(q.get("number"));
  const date = q.get("date");
  if (!q.get("number") && date && isIsoDate(date)) number = puzzleNumber(date, LAUNCH_DATE);
  if (!isPlayable(number)) return fail(404, "not_found", "No puzzle for that day");

  // Record the first view for signed-in daily plays: solve time is measured from here.
  if (q.get("daily") === "1") {
    const user = await userFrom(req);
    if (user) {
      await db()
        .from("plays")
        .upsert(
          { user_id: user.id, mode, edition, number, started_at: new Date().toISOString() },
          { onConflict: "user_id,mode,edition,number", ignoreDuplicates: true },
        );
    }
  }
  return json(puzzleInfo(mode, edition, number), { headers: { "Cache-Control": "private, no-store" } });
}
