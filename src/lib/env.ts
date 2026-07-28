/**
 * Central environment access.
 *
 * Anything prefixed NEXT_PUBLIC_ is bundled into the browser; everything else
 * is server-only. `isSupabaseConfigured()` lets the app run before real
 * Supabase keys are added — clients and the proxy no-op instead of crashing.
 */

const PLACEHOLDER = "REPLACE_ME";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** Server-only. Bypasses RLS — never import into client code. */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** True once real Supabase credentials are present (not the placeholders). */
export function isSupabaseConfigured(): boolean {
  return (
    env.supabaseUrl.length > 0 &&
    env.supabaseAnonKey.length > 0 &&
    !env.supabaseUrl.includes(PLACEHOLDER) &&
    !env.supabaseAnonKey.includes(PLACEHOLDER)
  );
}
