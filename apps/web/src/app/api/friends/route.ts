import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { ensureProfile, names } from "@/server/social";
import { db } from "@/server/supabase";

/** GET: friends and pending requests. */
export const GET = (req: Request) =>
  withUser(req, async (user) => {
    const { data } = await db()
      .from("friendships")
      .select("user_a, user_b, status, requested_by")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const rows = data ?? [];
    const other = (r: { user_a: string; user_b: string }) => (r.user_a === user.id ? r.user_b : r.user_a);
    const nm = await names(rows.map(other));
    return json({
      friends: rows.filter((r) => r.status === "accepted").map((r) => ({ user_id: other(r), name: nm.get(other(r)) ?? "Cook" })),
      incoming: rows
        .filter((r) => r.status === "pending" && r.requested_by !== user.id)
        .map((r) => ({ user_id: other(r), name: nm.get(other(r)) ?? "Cook" })),
      outgoing: rows
        .filter((r) => r.status === "pending" && r.requested_by === user.id)
        .map((r) => ({ user_id: other(r), name: nm.get(other(r)) ?? "Cook" })),
    });
  });

/** POST { code }: send a friend request by invite code; accepts at once if they already asked you. */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    await ensureProfile(user);
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    const { data: target } = await db().from("profiles").select("user_id, display_name").eq("friend_code", code).maybeSingle();
    if (!target) return fail(404, "not_found", "No player with that code");
    if (target.user_id === user.id) return fail(422, "self", "That's your own code");
    const [a, b] = [user.id, target.user_id].sort();
    const { data: existing } = await db().from("friendships").select("status, requested_by").match({ user_a: a, user_b: b }).maybeSingle();
    if (existing?.status === "accepted") return json({ status: "accepted", name: target.display_name });
    if (existing && existing.requested_by !== user.id) {
      await db().from("friendships").update({ status: "accepted" }).match({ user_a: a, user_b: b });
      return json({ status: "accepted", name: target.display_name });
    }
    if (!existing) await db().from("friendships").insert({ user_a: a, user_b: b, status: "pending", requested_by: user.id });
    return json({ status: "pending", name: target.display_name });
  });

/** DELETE { user_id }: remove a friend or cancel / decline a request. */
export const DELETE = (req: Request) =>
  withUser(req, async (user) => {
    const body = await req.json().catch(() => ({}));
    const [a, b] = [user.id, String(body.user_id ?? "")].sort();
    await db().from("friendships").delete().match({ user_a: a, user_b: b });
    return json({ ok: true });
  });
