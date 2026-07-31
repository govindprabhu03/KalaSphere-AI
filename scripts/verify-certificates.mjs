/**
 * End-to-end proof of certificate generation through the real RPCs/RLS:
 *   admin creates org + event -> attendee registers -> admin checks in
 *   -> admin issues certificates (idempotent) -> attendee lists their own
 *   -> anyone verifies by serial -> non-admin cannot issue.
 *
 * Run: npm run verify:certs
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
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

async function makeUser(label, fullName) {
  const email = `cert-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, client };
}

async function main() {
  const adminU = await makeUser("admin", "Ada Admin");
  const attendee = await makeUser("attendee", "Ravi Attendee");

  const { data: org, error: orgErr } = await adminU.client.rpc("create_organization", {
    org_name: "Cert Org", org_slug: `cert-${stamp}`,
  });
  if (orgErr) throw orgErr;
  created.orgs.push(org.id);

  // Published free event.
  const { data: ev, error: evErr } = await adminU.client.from("events").insert({
    organization_id: org.id, slug: `ev-${stamp}`, title: "Tabla Recital",
    starts_at: new Date(Date.now() + 86400000).toISOString(), price_cents: 0, is_published: true,
  }).select().single();
  if (evErr) throw evErr;

  // Attendee registers, admin checks them in.
  const { data: reg } = await attendee.client.rpc("register_for_event", { p_event_id: ev.id });
  check("attendee registered with a ticket", !!reg?.ticket_code);
  await adminU.client.rpc("check_in_ticket", { p_code: reg.ticket_code });

  // Before check-in there were none; issuing now creates exactly one.
  const { data: n1, error: issErr } = await adminU.client.rpc("issue_event_certificates", {
    p_event_id: ev.id, p_title: "Certificate of Participation",
  });
  if (issErr) throw issErr;
  check("issue_event_certificates creates 1 for the checked-in attendee", n1 === 1);

  // Idempotent: issuing again creates none.
  const { data: n2 } = await adminU.client.rpc("issue_event_certificates", {
    p_event_id: ev.id, p_title: "Certificate of Participation",
  });
  check("re-issuing is idempotent (0 new)", n2 === 0);

  // Attendee sees their own certificate with event + org names.
  const { data: mine } = await attendee.client.rpc("list_my_certificates");
  const cert = (mine ?? [])[0];
  check("attendee lists exactly one certificate", (mine?.length ?? 0) === 1);
  check("certificate carries event + org names", cert?.event_title === "Tabla Recital" && cert?.org_name === "Cert Org");
  check("certificate serial looks valid", typeof cert?.serial === "string" && cert.serial.startsWith("CERT-"));

  // Public verification by serial (anon) returns the recipient's name.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: ver } = await anon.rpc("certificate_by_serial", { p_serial: cert.serial });
  check("anon verifies the certificate by serial", ver?.[0]?.serial === cert.serial);
  check("verification shows the recipient name", ver?.[0]?.recipient_name === "Ravi Attendee");

  // A bogus serial returns nothing.
  const { data: bogus } = await anon.rpc("certificate_by_serial", { p_serial: "CERT-DOESNOTEXST" });
  check("unknown serial returns no rows", (bogus?.length ?? 0) === 0);

  // The attendee (non-admin) cannot issue certificates.
  const { error: notAllowed } = await attendee.client.rpc("issue_event_certificates", {
    p_event_id: ev.id, p_title: "hax",
  });
  check("non-admin CANNOT issue certificates", !!notAllowed);
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("\u{1f3c5}  Certificate-flow checks\n");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
