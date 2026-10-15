import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { SOCIAL_ENABLED, SUPABASE_URL } from "@/lib/config";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const serverSocialEnabled = SOCIAL_ENABLED && Boolean(SERVICE_KEY);

let admin: SupabaseClient | null = null;
/** Service-role client. Only used on the server, after the caller has been authenticated. */
export function db(): SupabaseClient {
  if (!serverSocialEnabled) throw new Error("Supabase is not configured");
  admin ??= createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/** Resolves the signed-in user from the `Authorization: Bearer <access token>` header. */
export async function userFrom(req: Request): Promise<User | null> {
  if (!serverSocialEnabled) return null;
  const h = req.headers.get("authorization");
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  return error ? null : data.user;
}
