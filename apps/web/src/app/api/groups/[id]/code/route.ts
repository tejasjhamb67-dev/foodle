import { withUser } from "@/server/guard";
import { fail, json } from "@/server/http";
import { newCode } from "@/server/social";
import { db } from "@/server/supabase";

/** POST: owner resets the join code. */
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  withUser(req, async (user) => {
    const { id } = await params;
    const { data, error } = await db().from("groups").update({ code: newCode() }).match({ id, owner: user.id }).select("code").maybeSingle();
    if (error) throw error;
    if (!data) return fail(403, "forbidden", "Only the owner can reset the code");
    return json(data);
  });
