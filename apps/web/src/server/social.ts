import "server-only";
import type { User } from "@supabase/supabase-js";
import { db } from "./supabase";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// A short blocklist; the database also enforces length. Extend before launch.
const BLOCKED = ["fuck", "shit", "cunt", "bitch", "nigg", "fag", "rape", "nazi", "chutiya", "madarchod", "bhenchod"];
export function validDisplayName(name: string): string | null {
  const n = name.trim().replace(/\s+/g, " ");
  if (n.length < 2 || n.length > 20) return null;
  const flat = n.toLowerCase().replace(/[^a-z]/g, "");
  if (BLOCKED.some((w) => flat.includes(w))) return null;
  return n;
}

export interface Profile {
  user_id: string;
  display_name: string;
  friend_code: string;
}

export async function ensureProfile(user: User): Promise<Profile> {
  const { data } = await db().from("profiles").select("user_id, display_name, friend_code").eq("user_id", user.id).maybeSingle();
  if (data) return data as Profile;
  const base = validDisplayName((user.user_metadata?.name as string) ?? user.email?.split("@")[0] ?? "") ?? "Cook";
  for (let i = 0; i < 5; i++) {
    const row = { user_id: user.id, display_name: base, friend_code: newCode() };
    const { data: created, error } = await db().from("profiles").insert(row).select().single();
    if (!error) return created as Profile;
    if (error.code !== "23505") throw error;
    const { data: again } = await db().from("profiles").select("user_id, display_name, friend_code").eq("user_id", user.id).maybeSingle();
    if (again) return again as Profile;
  }
  throw new Error("Could not create profile");
}

export async function names(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await db().from("profiles").select("user_id, display_name").in("user_id", ids);
  return new Map((data ?? []).map((p) => [p.user_id as string, p.display_name as string]));
}

export async function friendIds(userId: string): Promise<string[]> {
  const { data } = await db()
    .from("friendships")
    .select("user_a, user_b")
    .eq("status", "accepted")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  return (data ?? []).map((f) => (f.user_a === userId ? f.user_b : f.user_a) as string);
}

export async function isGroupMember(groupId: string, userId: string) {
  const { data } = await db().from("group_members").select("user_id").match({ group_id: groupId, user_id: userId }).maybeSingle();
  return Boolean(data);
}
