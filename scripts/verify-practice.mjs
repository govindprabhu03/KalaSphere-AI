/**
 * Proof of the practice-plan flow through real RLS/RPCs:
 *   faculty adds practice items -> enrolled student sees them (grouped data)
 *   -> a non-enrolled user sees none -> a student cannot add items.
 *
 * Run: npm run verify:practice
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
const check = (n, ok) => { if (ok) { passed++; console.log(`  ✅ ${n}`); } else { failed++; console.log(`  ❌ ${n}`); } };

async function makeUser(label) {
  const email = `prac-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: label } });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
}

async function main() {
  const faculty = await makeUser("fac");
  const student = await makeUser("stu");
  const stranger = await makeUser("out");

  const { data: org } = await faculty.client.rpc("create_organization", { org_name: "Practice Org", org_slug: `prac-${stamp}` });
  created.orgs.push(org.id);
  const { data: cls } = await faculty.client.from("classes").insert({ organization_id: org.id, slug: `vocal-${stamp}`, title: "Vocal", is_published: true }).select().single();
  const { data: batch } = await faculty.client.from("batches").insert({ class_id: cls.id, organization_id: org.id, name: "Morning batch" }).select().single();
  await admin.from("class_enrollments").insert({ batch_id: batch.id, class_id: cls.id, organization_id: org.id, student_user_id: student.id, status: "active" });

  // Faculty adds two practice items.
  const { error: p1 } = await faculty.client.from("practice_items").insert({
    batch_id: batch.id, organization_id: org.id, title: "Riyaz — Raag Yaman", day_of_week: 1, duration_min: 30, created_by: faculty.id,
  });
  const { error: p2 } = await faculty.client.from("practice_items").insert({
    batch_id: batch.id, organization_id: org.id, title: "Breathing exercise", day_of_week: null, duration_min: 10, created_by: faculty.id,
  });
  check("faculty can add practice items", !p1 && !p2);

  // Enrolled student sees both, with class title + day + duration.
  const { data: mine } = await student.client.rpc("list_my_practice");
  check("student sees both practice items", (mine?.length ?? 0) === 2);
  const yaman = (mine ?? []).find((x) => x.title.startsWith("Riyaz"));
  check("item carries class + day + duration", yaman?.class_title === "Vocal" && yaman?.day_of_week === 1 && yaman?.duration_min === 30);
  check("anytime item has null day", (mine ?? []).some((x) => x.title === "Breathing exercise" && x.day_of_week === null));

  // Non-enrolled user sees nothing.
  const { data: outList } = await stranger.client.rpc("list_my_practice");
  check("non-enrolled user sees no practice", (outList?.length ?? 0) === 0);

  // Student cannot add a practice item (RLS: staff only).
  const { error: stuInsert } = await student.client.from("practice_items").insert({
    batch_id: batch.id, organization_id: org.id, title: "sneaky", created_by: student.id,
  });
  check("student CANNOT add practice items", !!stuInsert);
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("\u{1f3b6}  Practice-plan checks\n");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
