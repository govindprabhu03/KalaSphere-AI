import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Client Components (browser).
 * Reads/writes the auth session from cookies via @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
