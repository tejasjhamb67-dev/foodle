import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { parseEdition, parseMode } from "@/server/params";
import { friendIds, isGroupMember, names } from "@/server/social";
import { db } from "@/server/supabase";
import { isPlayable } from "@/server/today";

interface Play {
  user_id: string;
  won: boolean;
  guess_count: number;
  solve_ms: number | null;
  squares: string[] | null;
  number: number;
  assisted: boolean;
}

/** Spec 11.2: solved before unsolved, then fewer guesses, then shorter solve time. Unassisted solves rank above solves that used options. */
function rank(rows: Play[]) {
  return [...rows].sort(
    (a, b) =>
      Number(b.won) - Number(a.won) ||
      Number(a.assisted) - Number(b.assisted) ||
      a.guess_count - b.guess_count ||
      (a.solve_ms ?? Infinity) - (b.solve_ms ?? Infinity),
  );
}

/**
 * GET /api/leaderboard?scope=friends|group|global&mode&edition&number[&group&period=week]
 */
export const GET = (req: Request) =>
  withUser(req, async (user) => {
    const q = new URL(req.url).searchParams;
    const scope = q.get("scope") ?? "friends";
    const mode = parseMode(q.get("mode"));
    const edition = parseEdition(q.get("edition"));
    const number = Number(q.get("number"));
    if (!mode || !edition || !isPlayable(number)) return fail(400, "bad_request", "Bad puzzle");

    const base = () =>
      db()
        .from("plays")
        .select("user_id, won, guess_count, solve_ms, squares, number, assisted")
        .match({ mode, edition })
        .not("finished_at", "is", null);

    let members: string[] | null = null;
    if (scope === "friends") members = [user.id, ...(await friendIds(user.id))];
    if (scope === "group") {
      const gid = q.get("group") ?? "";
      if (!(await isGroupMember(gid, user.id))) return fail(404, "not_found", "Group not found");
      const { data } = await db().from("group_members").select("user_id").eq("group_id", gid);
      members = (data ?? []).map((m) => m.user_id);
    }

    if (scope === "group" && q.get("period") === "week") {
      const { data } = await base()
        .in("user_id", members!)
        .gte("number", number - 6)
        .lte("number", number);
      const points = new Map<string, number>(members!.map((m) => [m, 0]));
      for (const p of (data ?? []) as Play[]) if (p.won) points.set(p.user_id, (points.get(p.user_id) ?? 0) + (7 - p.guess_count));
      const nm = await names(members!);
      const rows = [...points.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([uid, pts], i) => ({ rank: i + 1, user_id: uid, name: nm.get(uid) ?? "Cook", points: pts, you: uid === user.id }));
      return json({ rows });
    }

    let query = base().eq("number", number);
    if (members) query = query.in("user_id", members);
    const { data } = await query.limit(scope === "global" ? 5000 : 500);
    const ranked = rank((data ?? []) as Play[]);
    const youIndex = ranked.findIndex((r) => r.user_id === user.id);
    const shown = scope === "global" ? ranked.slice(0, 100) : ranked;
    if (scope === "global" && youIndex >= 100) shown.push(ranked[youIndex]);
    const nm = await names(shown.map((r) => r.user_id));
    return json({
      total: ranked.length,
      rows: shown.map((r) => ({
        rank: ranked.indexOf(r) + 1,
        user_id: r.user_id,
        name: nm.get(r.user_id) ?? "Cook",
        won: r.won,
        guesses: r.guess_count,
        solve_ms: r.solve_ms,
        squares: r.squares ?? [],
        assisted: r.assisted,
        you: r.user_id === user.id,
      })),
    });
  });
