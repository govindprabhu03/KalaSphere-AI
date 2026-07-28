/**
 * Proves that two organizations cannot read or modify each other's data
 * through Row-Level Security. Mirrors the quality gate used on Smart Inventory.
 *
 * Run: npm run verify:isolation
 * Requires: real Supabase creds in .env.local + migration 0001 applied.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function isConfigured() {
  return (
    url &&
    anonKey &&
    serviceKey &&
    ![url, anonKey, serviceKey].some((v) => v.includes("REPLACE_ME"))
  );
}

if (!isConfigured()) {
  console.log("⏭  SKIPPED: Supabase is not configured yet (placeholders in .env.local).");
  console.log("   1) Fill NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");
  console.log("   2) Apply supabase/migrations/0001_init_tenancy.sql");
  console.log("   3) Re-run: npm run verify:isolation");
  process.exit(0);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const created = { users: [], orgs: [] };
let passed = 0;
let failed = 0;

function check(name, ok) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

async function userClient(email, password) {
  const c = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function main() {
  // 1. Two organizations
  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .insert([
      { slug: `iso-a-${stamp}`, name: "Isolation Test A" },
      { slug: `iso-b-${stamp}`, name: "Isolation Test B" },
    ])
    .select();
  if (orgErr) throw orgErr;
  const [orgA, orgB] = orgs;
  created.orgs.push(orgA.id, orgB.id);

  // 2. Two users (one admin in each org)
  const pw = "Test-passw0rd!";
  const emailA = `iso-a-${stamp}@example.com`;
  const emailB = `iso-b-${stamp}@example.com`;
  const { data: ua, error: uaErr } = await admin.auth.admin.createUser({
    email: emailA,
    password: pw,
    email_confirm: true,
  });
  if (uaErr) throw uaErr;
  const { data: ub, error: ubErr } = await admin.auth.admin.createUser({
    email: emailB,
    password: pw,
    email_confirm: true,
  });
  if (ubErr) throw ubErr;
  created.users.push(ua.user.id, ub.user.id);

  const { error: mErr } = await admin.from("organization_members").insert([
    { organization_id: orgA.id, user_id: ua.user.id, role: "admin" },
    { organization_id: orgB.id, user_id: ub.user.id, role: "admin" },
  ]);
  if (mErr) throw mErr;

  const ca = await userClient(emailA, pw);
  const cb = await userClient(emailB, pw);

  // 3. Isolation assertions
  const aOwn = await ca.from("organizations").select("id").eq("id", orgA.id);
  check("User A can read their own org", (aOwn.data?.length ?? 0) === 1);

  const aB = await ca.from("organizations").select("id").eq("id", orgB.id);
  check("User A CANNOT read org B", (aB.data?.length ?? 0) === 0);

  const bA = await cb.from("organizations").select("id").eq("id", orgA.id);
  check("User B CANNOT read org A", (bA.data?.length ?? 0) === 0);

  const aBMembers = await ca
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgB.id);
  check("User A CANNOT read org B members", (aBMembers.data?.length ?? 0) === 0);

  const aAll = await ca.from("organizations").select("id");
  check(
    "User A's org list contains only their org",
    (aAll.data?.length ?? 0) === 1 && aAll.data[0].id === orgA.id,
  );

  const aUpdateB = await ca
    .from("organizations")
    .update({ name: "hacked" })
    .eq("id", orgB.id)
    .select();
  check("User A CANNOT update org B", (aUpdateB.data?.length ?? 0) === 0);

  const bAfter = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgB.id)
    .single();
  check(
    "Org B name unchanged after cross-tenant update attempt",
    bAfter.data?.name === "Isolation Test B",
  );
}

async function cleanup() {
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  if (created.orgs.length) {
    await admin.from("organizations").delete().in("id", created.orgs);
  }
}

console.log("\u{1f510} Tenant isolation checks\n");
main()
  .catch((e) => {
    failed++;
    console.error("  ❌ ERROR:", e.message);
  })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(
      `\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`,
    );
    process.exit(failed === 0 ? 0 : 1);
  });
