import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { env, isSupabaseConfigured } from "@/lib/env";

/**
 * Refreshes the Supabase auth session on every request and forwards the
 * updated auth cookies to both the request (for Server Components) and the
 * response (for the browser). Called from the Next.js 16 proxy.
 *
 * No-ops until real Supabase credentials are configured.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the user to trigger a token refresh when needed. Do not run code
  // between createServerClient and getUser — it can cause random logouts.
  await supabase.auth.getUser();

  return response;
}
