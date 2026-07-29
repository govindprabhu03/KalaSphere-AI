/**
 * End-to-end proof of the Phase 1 flow, exercised through the same RPCs/RLS
 * the UI uses:
 *   register -> create_organization (become admin) -> list_org_members
 *   -> add_member_by_email -> role/RLS enforcement for a non-admin.
 *
 * Run: npm run verify:phase1
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !anonKey || !serviceKey || [url, anonKey, serviceKey].some((v) => v.includes("REPLACE_ME"))) {
  console.log("⏭  SKIPPED: Supabase not configured.");
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

async function makeUser(label) {
  const email = `p1-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${label} user` },
  });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`sign-in failed: ${signInErr.message}`);
  return { email, client, id: data.user.id };
}

async function main() {
  const alice = await makeUser("admin");
  const bob = await makeUser("member");

  // Alice creates an organization -> becomes admin.
  const { data: org, error: orgErr } = await alice.client.rpc("create_organization", {
    org_name: "Phase 1 Test Org",
    org_slug: `phase1-${stamp}`,
  });
  if (orgErr) throw orgErr;
  created.orgs.push(org.id);
  check("create_organization returns the new org", org?.name === "Phase 1 Test Org");

  // Alice is listed as the sole admin.
  const { data: m1 } = await alice.client.rpc("list_org_members", { org: org.id });
  check(
    "Alice is the org's only member, role=admin",
    (m1?.length ?? 0) === 1 && m1[0].role === "admin" && m1[0].user_id === alice.id,
  );

  // Alice adds Bob as a student by email.
  const { error: addErr } = await alice.client.rpc("add_member_by_email", {
    org: org.id,
    member_email: bob.email,
    member_role: "student",
  });
  check("add_member_by_email succeeds", !addErr);

  const { data: m2 } = await alice.client.rpc("list_org_members", { org: org.id });
  const bobRow = (m2 ?? []).find((r) => r.user_id === bob.id);
  check("Bob now appears as a student", bobRow?.role === "student");

  // Bob (non-admin) cannot list members.
  const { data: bobList } = await bob.client.rpc("list_org_members", { org: org.id });
  check("Bob (student) CANNOT list members", (bobList?.length ?? 0) === 0);

  // Bob can read the org he now belongs to.
  const bobOrg = await bob.client.from("organizations").select("id").eq("id", org.id);
  check("Bob can read his own org", (bobOrg.data?.length ?? 0) === 1);

  // Bob cannot update the org (not admin).
  const bobUpdate = await bob.client
    .from("organizations")
    .update({ name: "hacked" })
    .eq("id", org.id)
    .select();
  check("Bob CANNOT update the org", (bobUpdate.data?.length ?? 0) === 0);

  // Bob cannot add members.
  const { error: bobAddErr } = await bob.client.rpc("add_member_by_email", {
    org: org.id,
    member_email: `intruder-${stamp}@example.com`,
    member_role: "admin",
  });
  check("Bob CANNOT add members", !!bobAddErr);
}

async function cleanup() {
  if (created.orgs.length) {
    await admin.from("organizations").delete().in("id", created.orgs);
  }
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

console.log("\u{1f9ea} Phase 1 end-to-end checks\n");
main()
  .catch((e) => {
    failed++;
    console.error("  ❌ ERROR:", e.message);
  })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
