/**
 * Smoke test: an unauthenticated (anonymous) client must NOT be able to read
 * any protected table. RLS should return zero rows (or deny outright).
 *
 * Run: npm run verify:rls
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!url || !anonKey || [url, anonKey].some((v) => v.includes("REPLACE_ME"))) {
  console.log("⏭  SKIPPED: Supabase not configured (placeholders in .env.local).");
  process.exit(0);
}

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PROTECTED = [
  "organizations",
  "profiles",
  "organization_members",
  "parent_child_links",
  "audit_log",
];

let passed = 0;
let failed = 0;

async function main() {
  for (const table of PROTECTED) {
    const { data } = await anon.from(table).select("*").limit(1);
    const ok = (data?.length ?? 0) === 0; // denied or empty under RLS
    if (ok) {
      passed++;
      console.log(`  ✅ anon cannot read ${table}`);
    } else {
      failed++;
      console.log(`  ❌ anon CAN read ${table} (RLS leak!)`);
    }
  }
}

console.log("\u{1f6e1}️  RLS anonymous-access checks\n");
main()
  .catch((e) => {
    failed++;
    console.error("  ❌ ERROR:", e.message);
  })
  .finally(() => {
    console.log(
      `\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`,
    );
    process.exit(failed === 0 ? 0 : 1);
  });
