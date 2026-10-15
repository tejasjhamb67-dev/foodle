import { SITE_URL } from "@/lib/config";
import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { ensureProfile, isGroupMember } from "@/server/social";
import { db } from "@/server/supabase";

/** POST { kind: "friend" | "group", id? } → { code, link } */
export const POST = (req: Request) =>
  withUser(req, async (user) => {
    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get("origin") ?? SITE_URL;
    if (body.kind === "group") {
      const id = String(body.id ?? "");
      if (!(await isGroupMember(id, user.id))) return fail(404, "not_found", "Group not found");
      const { data } = await db().from("groups").select("code").eq("id", id).single();
      return json({ code: data!.code, link: `${origin}/invite/${data!.code}?k=g` });
    }
    const p = await ensureProfile(user);
    return json({ code: p.friend_code, link: `${origin}/invite/${p.friend_code}?k=f` });
  });
