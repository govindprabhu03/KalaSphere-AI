/**
 * Dev-only helper: create/cleanup a CONFIRMED test user for manual/UI checks.
 *   node scripts/_ui-test.mjs create
 *   node scripts/_ui-test.mjs cleanup
 * (Underscore prefix = throwaway; not part of the verify suite.)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAIL = "ravindra-ui-test@example.com";
const PW = "Test-passw0rd!";

async function findUser(email) {
  const { data } = await admin.auth.admin.listUsers();
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function deleteUserAndOrgs(userId) {
  const { data: mships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  const orgIds = (mships ?? []).map((m) => m.organization_id);
  if (orgIds.length) await admin.from("organizations").delete().in("id", orgIds);
  await admin.auth.admin.deleteUser(userId).catch(() => {});
}

const mode = process.argv[2];

if (mode === "create") {
  const existing = await findUser(EMAIL);
  if (existing) await deleteUserAndOrgs(existing.id);
  const { error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PW,
    email_confirm: true,
    user_metadata: { full_name: "Ravindra UI Test" },
  });
  if (error) throw error;
  console.log(`CREATED ${EMAIL} / ${PW}`);
} else if (mode === "cleanup") {
  const u = await findUser(EMAIL);
  if (u) {
    await deleteUserAndOrgs(u.id);
    console.log(`CLEANED ${EMAIL}`);
  } else {
    console.log("no test user found");
  }
} else {
  console.log("usage: node scripts/_ui-test.mjs create|cleanup");
}
