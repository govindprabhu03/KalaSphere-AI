/**
 * End-to-end proof of the Phase 2 event flow through the real RPCs/RLS:
 *   admin creates org + event -> public sees published (not drafts)
 *   -> attendee registers (gets ticket) -> admin lists + checks in
 *   -> attendee leaves feedback -> non-admin blocked.
 *
 * Run: npm run verify:phase2
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

async function makeUser(label) {
  const email = `p2-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `${label}` },
  });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, client };
}

async function main() {
  const adminU = await makeUser("admin");
  const attendee = await makeUser("attendee");

  const { data: org, error: orgErr } = await adminU.client.rpc("create_organization", {
    org_name: "Phase 2 Org", org_slug: `p2-${stamp}`,
  });
  if (orgErr) throw orgErr;
  created.orgs.push(org.id);

  // Admin creates a published (free) event + a draft event.
  const { data: pub, error: pubErr } = await adminU.client.from("events").insert({
    organization_id: org.id, slug: `pub-${stamp}`, title: "Published Event",
    starts_at: new Date(Date.now() + 86400000).toISOString(), price_cents: 0, is_published: true,
  }).select().single();
  if (pubErr) throw pubErr;
  check("admin can create a published event", pub?.title === "Published Event");

  const { data: draft } = await adminU.client.from("events").insert({
    organization_id: org.id, slug: `draft-${stamp}`, title: "Draft Event",
    starts_at: new Date(Date.now() + 172800000).toISOString(), price_cents: 0, is_published: false,
  }).select().single();

  // Anonymous visitor sees the published event but NOT the draft.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonList = await anon.from("events").select("id, is_published").eq("organization_id", org.id);
  check("public sees only published events", (anonList.data?.length ?? 0) === 1 && anonList.data[0].id === pub.id);

  // Attendee registers -> gets a ticket.
  const { data: reg, error: regErr } = await attendee.client.rpc("register_for_event", { p_event_id: pub.id });
  if (regErr) throw regErr;
  check("register_for_event issues a ticket", !!reg?.ticket_code && reg.payment_status === "not_required");

  // Idempotent: registering again returns the same registration.
  const { data: reg2 } = await attendee.client.rpc("register_for_event", { p_event_id: pub.id });
  check("re-registering is idempotent", reg2?.id === reg.id);

  // Admin lists registrations; non-admin cannot.
  const { data: adminRegs } = await adminU.client.rpc("list_event_registrations", { p_event_id: pub.id });
  check("admin sees the registration", (adminRegs ?? []).some((r) => r.user_id === attendee.id));
  const { data: attRegs } = await attendee.client.rpc("list_event_registrations", { p_event_id: pub.id });
  check("attendee CANNOT list registrations", (attRegs?.length ?? 0) === 0);

  // Check-in.
  const { data: ci } = await adminU.client.rpc("check_in_ticket", { p_code: reg.ticket_code });
  check("first check-in marks attendance", ci?.[0]?.already === false);
  const { data: ci2 } = await adminU.client.rpc("check_in_ticket", { p_code: reg.ticket_code });
  check("second check-in is idempotent (already=true)", ci2?.[0]?.already === true);

  // Feedback.
  const { error: fbErr } = await attendee.client.rpc("submit_event_feedback", {
    p_event_id: pub.id, p_rating: 5, p_comment: "Great!",
  });
  check("attendee can submit feedback", !fbErr);

  // Registration on a draft event is rejected.
  const { error: draftErr } = await attendee.client.rpc("register_for_event", { p_event_id: draft.id });
  check("registering for a draft event is blocked", !!draftErr);

  // Public org lookup works.
  const { data: porg } = await anon.rpc("public_org_by_slug", { p_slug: `p2-${stamp}` });
  check("public_org_by_slug returns the org", porg?.[0]?.id === org.id);
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("\u{1f39f}\u{fe0f}  Phase 2 event-flow checks\n");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
