import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { isGroupMember, names } from "@/server/social";
import { db } from "@/server/supabase";

type Ctx = { params: Promise<{ id: string }> };

/** GET: group details and members (members only). */
export const GET = (req: Request, { params }: Ctx) =>
  withUser(req, async (user) => {
    const { id } = await params;
    if (!(await isGroupMember(id, user.id))) return fail(404, "not_found", "Group not found");
    const { data: g } = await db().from("groups").select("id, name, owner, code").eq("id", id).single();
    const { data: m } = await db().from("group_members").select("user_id").eq("group_id", id);
    const nm = await names((m ?? []).map((x) => x.user_id));
    return json({
      ...g,
      isOwner: g?.owner === user.id,
      members: (m ?? []).map((x) => ({ user_id: x.user_id, name: nm.get(x.user_id) ?? "Cook", isOwner: x.user_id === g?.owner })),
    });
  });

/** DELETE { user_id }: owner removes a member, or a member leaves (user_id = self). */
export const DELETE = (req: Request, { params }: Ctx) =>
  withUser(req, async (user) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const target = String(body.user_id ?? user.id);
    const { data: g } = await db().from("groups").select("owner").eq("id", id).maybeSingle();
    if (!g) return fail(404, "not_found", "Group not found");
    if (target !== user.id && g.owner !== user.id) return fail(403, "forbidden", "Only the owner can remove members");
    if (target === g.owner) {
      // Owner leaving deletes the group.
      await db().from("groups").delete().eq("id", id);
      return json({ deleted: true });
    }
    await db().from("group_members").delete().match({ group_id: id, user_id: target });
    return json({ ok: true });
  });
