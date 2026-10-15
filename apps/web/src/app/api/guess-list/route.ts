import { guessList } from "@/server/content";
import { fail, json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";

/** GET /api/guess-list?mode&edition → id, name, aliases, meta. Cached on the device by version. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const mode = parseMode(q.get("mode"));
  const edition = parseEdition(q.get("edition"));
  if (!mode || !edition) return fail(400, "bad_request", "Unknown mode or edition");
  return json(guessList(mode, edition), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
