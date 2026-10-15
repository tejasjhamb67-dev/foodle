import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { ensureProfile } from "@/server/social";
import { db } from "@/server/supabase";

export const MAX_MEMBERS = 50;

/** POST { code }: join a group by its code. */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    await ensureProfile(user);
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    const { data: g } = await db().from("groups").select("id, name").eq("code", code).maybeSingle();
    if (!g) return fail(404, "not_found", "No group with that code");
    const { count: members } = await db().from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", g.id);
    if ((members ?? 0) >= MAX_MEMBERS) return fail(422, "full", "This group is full");
    const { count: mine } = await db().from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((mine ?? 0) >= 10) return fail(422, "limit", "You can be in up to 10 groups");
    await db().from("group_members").upsert({ group_id: g.id, user_id: user.id }, { onConflict: "group_id,user_id", ignoreDuplicates: true });
    return json(g);
  });
