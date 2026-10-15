import { withUser } from "@/server/guard";
import { json } from "@/server/http";
import { db } from "@/server/supabase";

/** POST { user_id, accept }: answer an incoming request. */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    const body = await req.json().catch(() => ({}));
    const [a, b] = [user.id, String(body.user_id ?? "")].sort();
    const q = db().from("friendships");
    if (body.accept) await q.update({ status: "accepted" }).match({ user_a: a, user_b: b, status: "pending" }).neq("requested_by", user.id);
    else await q.delete().match({ user_a: a, user_b: b, status: "pending" });
    return json({ ok: true });
  });
