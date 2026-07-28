import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. BYPASSES Row-Level Security.
 *
 * Server-only. Use exclusively for trusted, privileged operations (e.g. seeding,
 * cross-tenant admin tasks explicitly gated by super-admin checks). NEVER import
 * this into a Client Component or expose the service-role key to the browser.
 */
export function createAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — cannot create the admin client.",
    );
  }
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
