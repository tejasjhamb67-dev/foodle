import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { ensureProfile, newCode } from "@/server/social";
import { db } from "@/server/supabase";

export const MAX_GROUPS_PER_PLAYER = 10;

/** GET: my groups. */
export const GET = (req: Request) =>
  withUser(req, async (user) => {
    const { data: mine } = await db().from("group_members").select("group_id").eq("user_id", user.id);
    const ids = (mine ?? []).map((m) => m.group_id);
    if (!ids.length) return json({ groups: [] });
    const { data: groups } = await db().from("groups").select("id, name, owner, code").in("id", ids);
    const { data: counts } = await db().from("group_members").select("group_id").in("group_id", ids);
    const n = new Map<string, number>();
    for (const c of counts ?? []) n.set(c.group_id, (n.get(c.group_id) ?? 0) + 1);
    return json({
      groups: (groups ?? []).map((g) => ({ ...g, members: n.get(g.id) ?? 0, isOwner: g.owner === user.id })),
    });
  });

/** POST { name }: create a group; the creator is owner and first member. */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    await ensureProfile(user);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 30) return fail(422, "invalid_name", "Group names are 2–30 characters");
    const { count } = await db().from("group_members").select("group_id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= MAX_GROUPS_PER_PLAYER) return fail(422, "limit", "You can be in up to 10 groups");
    const { data: g, error } = await db().from("groups").insert({ name, owner: user.id, code: newCode() }).select().single();
    if (error) throw error;
    await db().from("group_members").insert({ group_id: g.id, user_id: user.id });
    return json(g);
  });
