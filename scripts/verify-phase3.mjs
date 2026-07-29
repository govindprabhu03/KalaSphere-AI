/**
 * End-to-end proof of the Phase 3 flows (workshops + cultural classes) through
 * the real RPCs/RLS. Run: npm run verify:phase3
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

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const stamp = Date.now();
const created = { users: [], orgs: [] };
let passed = 0, failed = 0;
const check = (n, ok) => { ok ? (passed++, console.log(`  ✅ ${n}`)) : (failed++, console.log(`  ❌ ${n}`)); };

async function makeUser(label) {
  const email = `p3-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: label } });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, client };
}

async function main() {
  const adminU = await makeUser("admin");
  const student = await makeUser("student");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: org } = await adminU.client.rpc("create_organization", { org_name: "Phase 3 Org", org_slug: `p3-${stamp}` });
  created.orgs.push(org.id);

  // --- Workshops ---
  const { data: ws } = await adminU.client.from("workshops").insert({
    organization_id: org.id, slug: `ws-${stamp}`, title: "Tabla Workshop", price_cents: 0, is_published: true,
  }).select().single();
  check("admin creates a published workshop", ws?.title === "Tabla Workshop");

  const { data: wen, error: wenErr } = await student.client.rpc("enroll_in_workshop", { p_workshop_id: ws.id });
  check("student enrolls in workshop", !wenErr && wen?.status === "enrolled");

  const { data: wlist } = await adminU.client.rpc("list_workshop_enrollments", { p_workshop_id: ws.id });
  check("admin lists workshop enrollments", (wlist ?? []).some((r) => r.user_id === student.id));

  const { data: draftWs } = await adminU.client.from("workshops").insert({
    organization_id: org.id, slug: `wsd-${stamp}`, title: "Draft WS", price_cents: 0, is_published: false,
  }).select().single();
  const { error: draftEnrollErr } = await student.client.rpc("enroll_in_workshop", { p_workshop_id: draftWs.id });
  check("enrolling in a draft workshop is blocked", !!draftEnrollErr);

  // --- Classes / batches ---
  const { data: cls } = await adminU.client.from("classes").insert({
    organization_id: org.id, slug: `cls-${stamp}`, title: "Vocal Music", discipline: "Vocal", is_published: true,
  }).select().single();
  const { data: batch } = await adminU.client.from("batches").insert({
    class_id: cls.id, organization_id: org.id, name: "Beginners A", schedule_text: "Mon/Wed 6pm",
  }).select().single();
  check("admin creates a published class + batch", batch?.name === "Beginners A");

  const { data: cen, error: cenErr } = await student.client.rpc("enroll_in_class", { p_batch_id: batch.id });
  check("student enrolls in a batch", !cenErr && cen?.status === "active");
  const { data: cen2 } = await student.client.rpc("enroll_in_class", { p_batch_id: batch.id });
  check("class enrollment is idempotent", cen2?.id === cen.id);

  const { data: students } = await adminU.client.rpc("list_batch_students", { p_batch_id: batch.id });
  check("admin lists batch students", (students ?? []).some((s) => s.student_user_id === student.id));
  const { data: studentsAsStudent } = await student.client.rpc("list_batch_students", { p_batch_id: batch.id });
  check("student CANNOT list batch students", (studentsAsStudent?.length ?? 0) === 0);

  // --- Sessions + attendance ---
  const { data: session } = await adminU.client.from("class_sessions").insert({
    batch_id: batch.id, organization_id: org.id, title: "Session 1", session_date: new Date().toISOString().slice(0, 10),
  }).select().single();
  const { data: att, error: attErr } = await adminU.client.rpc("mark_class_attendance", {
    p_session_id: session.id, p_student: student.id, p_present: true,
  });
  check("admin marks attendance", !attErr && att?.present === true);

  // --- Public visibility ---
  const { data: pubClasses } = await anon.from("classes").select("id").eq("organization_id", org.id).eq("is_published", true);
  check("public sees the published class", (pubClasses?.length ?? 0) === 1);
  const { data: pubWs } = await anon.from("workshops").select("id").eq("organization_id", org.id).eq("is_published", true);
  check("public sees the published workshop", (pubWs?.length ?? 0) === 1);
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("\u{1f3b6} Phase 3 workshops + classes checks\n");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
