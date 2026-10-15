import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { ensureProfile, validDisplayName } from "@/server/social";
import { db } from "@/server/supabase";

export const GET = (req: Request) => withUser(req, async (user) => json(await ensureProfile(user)));

export const PATCH = (req: Request) =>
  withUser(req, async (user) => {
    const body = await req.json().catch(() => ({}));
    const name = validDisplayName(String(body.display_name ?? ""));
    if (!name) return fail(422, "invalid_name", "Names are 2–20 characters and must be friendly");
    await ensureProfile(user);
    const { data, error } = await db().from("profiles").update({ display_name: name }).eq("user_id", user.id).select().single();
    if (error) throw error;
    return json(data);
  });
