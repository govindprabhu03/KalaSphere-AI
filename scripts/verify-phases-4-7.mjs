/**
 * Backend end-to-end proof for Phases 4–7 (growth, venues, canteen, content)
 * through the real RPCs/RLS. Run: npm run verify:more
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
const check = (name, ok) => { if (ok) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.log(`  ❌ ${name}`); } };

async function makeUser(label) {
  const email = `p47-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: label } });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  return { id: data.user.id, email, client };
}

async function main() {
  const adminU = await makeUser("admin");
  const student = await makeUser("student");
  const parent = await makeUser("parent");
  const outsider = await makeUser("outsider");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: org } = await adminU.client.rpc("create_organization", { org_name: "P47 Org", org_slug: `p47-${stamp}` });
  created.orgs.push(org.id);

  // Class + batch + student enrollment (needed for growth).
  const { data: cls } = await adminU.client.from("classes").insert({ organization_id: org.id, slug: `c-${stamp}`, title: "Vocal", is_published: true }).select().single();
  const { data: batch } = await adminU.client.from("batches").insert({ class_id: cls.id, organization_id: org.id, name: "Batch A" }).select().single();
  await student.client.rpc("enroll_in_class", { p_batch_id: batch.id });

  console.log("\n— Phase 4: growth —");
  const { error: evErr } = await adminU.client.rpc("upsert_evaluation", {
    p_batch_id: batch.id, p_student: student.id, p_period: "2026-07",
    p_pitch: 8, p_rhythm: 7, p_voice: 9, p_confidence: 6, p_coordination: 7,
    p_expression: 8, p_practice: 5, p_attendance: 9, p_performance: 7, p_remarks: "Great progress",
  });
  check("faculty/admin can save an evaluation", !evErr);
  const { data: g1 } = await adminU.client.rpc("list_student_growth", { p_student: student.id });
  check("admin sees the evaluation", (g1?.length ?? 0) === 1 && g1[0].pitch === 8);
  const { data: gSelf } = await student.client.rpc("list_student_growth", { p_student: student.id });
  check("student sees their own growth", (gSelf?.length ?? 0) === 1);
  const { error: linkErr } = await adminU.client.rpc("link_parent_to_student", { p_org: org.id, p_parent_email: parent.email, p_student: student.id });
  check("admin links a parent", !linkErr);
  const { data: gParent } = await parent.client.rpc("list_student_growth", { p_student: student.id });
  check("linked parent sees the child's growth", (gParent?.length ?? 0) === 1);
  const { data: gOut } = await outsider.client.rpc("list_student_growth", { p_student: student.id });
  check("outsider CANNOT see the growth", (gOut?.length ?? 0) === 0);

  console.log("\n— Phase 5: venues —");
  const { data: venue } = await adminU.client.from("venues").insert({ organization_id: org.id, name: "Hall", base_rate_cents: 50000 }).select().single();
  const t1 = new Date(Date.now() + 86400000).toISOString();
  const t2 = new Date(Date.now() + 90000000).toISOString();
  const { data: bk } = await student.client.rpc("request_booking", { p_venue: venue.id, p_starts: t1, p_ends: t2, p_title: "Rehearsal", p_facilities: ["Sound"], p_notes: "" });
  check("student can request a booking", !!bk?.id && bk.status === "requested");
  const { data: list } = await adminU.client.rpc("list_org_bookings", { p_org: org.id });
  check("admin sees the booking request", (list ?? []).some((b) => b.booking_id === bk.id));
  const { data: dec } = await adminU.client.rpc("decide_booking", { p_booking: bk.id, p_approve: true });
  check("admin approves the booking", dec?.status === "approved");
  const { error: conflictErr } = await student.client.rpc("request_booking", { p_venue: venue.id, p_starts: t1, p_ends: t2, p_title: "Clash", p_facilities: [], p_notes: "" });
  check("overlapping booking is rejected", !!conflictErr);
  const { data: busy } = await anon.rpc("list_venue_busy", { p_venue: venue.id });
  check("public sees the approved slot as busy", (busy ?? []).length === 1);

  console.log("\n— Phase 6: canteen —");
  const { data: item } = await adminU.client.from("menu_items").insert({ organization_id: org.id, name: "Chai", price_cents: 2000 }).select().single();
  const { data: order } = await student.client.rpc("place_order", { p_org: org.id, p_items: [{ menu_item_id: item.id, qty: 2 }] });
  check("student places an order with correct total", order?.total_cents === 4000 && !!order?.order_number);
  const { data: kitchen } = await adminU.client.rpc("list_kitchen_orders", { p_org: org.id });
  check("order appears on the kitchen board", (kitchen ?? []).some((o) => o.order_id === order.id));
  const { data: upd } = await adminU.client.rpc("update_order_status", { p_order: order.id, p_status: "preparing" });
  check("staff advances order status", upd?.status === "preparing");
  const { error: badStatus } = await student.client.rpc("update_order_status", { p_order: order.id, p_status: "ready" });
  check("customer CANNOT change order status", !!badStatus);

  console.log("\n— Phase 7: content —");
  const { data: news } = await adminU.client.from("news_posts").insert({ organization_id: org.id, slug: `n-${stamp}`, title: "Hello", body: "Body", is_published: true }).select().single();
  const anonNews = await anon.from("news_posts").select("id").eq("id", news.id);
  check("public reads a published news post", (anonNews.data?.length ?? 0) === 1);
  await adminU.client.from("announcements").insert({ organization_id: org.id, message: "Notice" });
  const anonAnn = await anon.from("announcements").select("id").eq("organization_id", org.id);
  check("public reads announcements", (anonAnn.data?.length ?? 0) >= 1);
  const { error: artErr } = await student.client.from("artist_profiles").insert({ organization_id: org.id, user_id: student.id, stage_name: "The Voice", is_public: true });
  check("a user can create their own artist profile", !artErr);
  const anonArt = await anon.from("artist_profiles").select("id").eq("organization_id", org.id).eq("is_public", true);
  check("public sees public artist profiles", (anonArt.data?.length ?? 0) === 1);
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("🧪 Phases 4–7 backend checks");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
