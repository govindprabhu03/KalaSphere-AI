/**
 * End-to-end proof of the assignment flow through the real RPCs/RLS:
 *   faculty creates an assignment -> enrolled student submits
 *   -> faculty lists + grades -> student sees the grade + feedback.
 *   Plus negatives: a non-enrolled user can't submit; a student can't grade.
 *
 * Run: npm run verify:assign
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
const check = (name, ok) => {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
};

async function makeUser(label, fullName) {
  const email = `asg-${label}-${stamp}@example.com`;
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
  const facultyU = await makeUser("fac", "Guru Anand");
  const studentU = await makeUser("stu", "Meera Nair");
  const strangerU = await makeUser("out", "Random Person");

  const { data: org, error: orgErr } = await facultyU.client.rpc("create_organization", {
    org_name: "Assign Org", org_slug: `asg-${stamp}`,
  });
  if (orgErr) throw orgErr;
  created.orgs.push(org.id);

  const { data: cls } = await facultyU.client
    .from("classes")
    .insert({ organization_id: org.id, slug: `vocal-${stamp}`, title: "Vocal", is_published: true })
    .select().single();
  const { data: batch } = await facultyU.client
    .from("batches")
    .insert({ class_id: cls.id, organization_id: org.id, name: "Morning batch" })
    .select().single();

  // Seed the student's enrollment (service role — app does this via enroll_in_class).
  await admin.from("class_enrollments").insert({
    batch_id: batch.id, class_id: cls.id, organization_id: org.id,
    student_user_id: studentU.id, status: "active",
  });

  // Faculty creates an assignment (direct insert under RLS assignments_manage).
  const { data: asg, error: asgErr } = await facultyU.client
    .from("assignments")
    .insert({ batch_id: batch.id, organization_id: org.id, title: "Practice Raag Yaman", created_by: facultyU.id })
    .select().single();
  check("faculty can create an assignment", !asgErr && !!asg?.id);

  // Enrolled student submits.
  const { error: subErr } = await studentU.client.rpc("submit_assignment", {
    p_assignment_id: asg.id, p_content: "Practised for 40 minutes.", p_attachment_url: "",
  });
  check("enrolled student can submit", !subErr);

  // A non-enrolled user cannot submit.
  const { error: outErr } = await strangerU.client.rpc("submit_assignment", {
    p_assignment_id: asg.id, p_content: "let me in", p_attachment_url: "",
  });
  check("non-enrolled user CANNOT submit", !!outErr);

  // Faculty sees the submission.
  const { data: subs } = await facultyU.client.rpc("list_assignment_submissions", { p_assignment_id: asg.id });
  const sub = (subs ?? [])[0];
  check("faculty lists exactly one submission", (subs?.length ?? 0) === 1);
  check("submission shows student + content", sub?.full_name === "Meera Nair" && sub?.content?.startsWith("Practised"));
  check("submission starts as 'submitted'", sub?.status === "submitted");

  // Student cannot grade.
  const { error: stuGradeErr } = await studentU.client.rpc("grade_assignment", {
    p_submission_id: sub.submission_id, p_grade: "A+", p_feedback: "self five",
  });
  check("student CANNOT grade", !!stuGradeErr);

  // Faculty grades.
  const { error: gradeErr } = await facultyU.client.rpc("grade_assignment", {
    p_submission_id: sub.submission_id, p_grade: "A", p_feedback: "Lovely tone — refine the taans.",
  });
  check("faculty can grade", !gradeErr);

  // Student sees the grade + feedback.
  const { data: mine } = await studentU.client.rpc("list_my_assignments");
  const row = (mine ?? [])[0];
  check("student lists their assignment", (mine?.length ?? 0) === 1);
  check("status is now 'graded'", row?.submission_status === "graded");
  check("student sees grade + feedback", row?.my_grade === "A" && row?.my_feedback?.includes("taans"));
}

async function cleanup() {
  if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
  for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
}

console.log("\u{1f4dd}  Assignment-flow checks\n");
main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    await cleanup().catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });
