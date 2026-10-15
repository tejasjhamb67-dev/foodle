/** Launch day: puzzle No. 1. Shared by server and client. */
export const LAUNCH_DATE = process.env.NEXT_PUBLIC_FOODLE_LAUNCH ?? "2026-10-01";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foodle.app";
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SOCIAL_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
