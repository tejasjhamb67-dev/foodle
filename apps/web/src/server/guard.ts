import "server-only";
import type { User } from "@supabase/supabase-js";
import { fail } from "./http";
import { serverSocialEnabled, userFrom } from "./supabase";

/** Runs `fn` for a signed-in user, or returns 401 / 503. */
export async function withUser(req: Request, fn: (user: User) => Promise<Response>): Promise<Response> {
  if (!serverSocialEnabled) return fail(503, "social_disabled", "Accounts are not set up on this server");
  const user = await userFrom(req);
  if (!user) return fail(401, "unauthorized", "Sign in first");
  return fn(user);
}
