/**
 * Proof that the kitchen board's Realtime works: a staff member subscribed to
 * their org's orders receives a live event when a customer places an order and
 * when the order's status changes. RLS applies — only staff (who can SELECT the
 * row) get it.
 *
 * Run: npm run verify:realtime
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, ms) {
  const start = Date.now();
  while (Date.now() - start < ms) { if (pred()) return true; await sleep(150); }
  return false;
}

async function makeUser(label) {
  const email = `rt-${label}-${stamp}@example.com`;
  const password = "Test-passw0rd!";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: label } });
  if (error) throw error;
  created.users.push(data.user.id);
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: sess } = await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client, token: sess.session.access_token };
}

let staff;
async function main() {
  staff = await makeUser("staff");
  const customer = await makeUser("cust");

  const { data: org } = await staff.client.rpc("create_organization", { org_name: "RT Org", org_slug: `rt-${stamp}` });
  created.orgs.push(org.id);
  const { data: mi } = await staff.client
    .from("menu_items")
    .insert({ organization_id: org.id, name: "Masala Chai", price_cents: 2000, is_available: true })
    .select().single();

  // Staff subscribes to their org's orders over Realtime (RLS-authorized).
  staff.client.realtime.setAuth(staff.token);
  const events = [];
  const channel = staff.client
    .channel(`kitchen:${org.id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${org.id}` },
      (payload) => events.push(payload.eventType));

  const subscribed = await new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve(true);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve(false);
    });
  });
  check("staff subscribes to the orders channel", subscribed);

  // Let Realtime finish registering the subscription server-side before we
  // trigger changes (a test-only settle; a live board subscribes long before
  // any order arrives).
  await sleep(2500);

  // Customer places an order -> staff should get a live event.
  const { data: order, error: ordErr } = await customer.client.rpc("place_order", {
    p_org: org.id, p_items: [{ menu_item_id: mi.id, qty: 2 }],
  });
  if (ordErr) throw ordErr;
  const gotInsert = await waitFor(() => events.length > 0, 12000);
  check("staff receives a live event when an order is placed", gotInsert);

  // Staff advances status -> another live event.
  const before = events.length;
  await staff.client.rpc("update_order_status", { p_order: order.id, p_status: "preparing" });
  const gotUpdate = await waitFor(() => events.length > before, 12000);
  check("staff receives a live event on status change", gotUpdate);

  await staff.client.removeChannel(channel);
}

main()
  .catch((e) => { failed++; console.error("  ❌ ERROR:", e.message); })
  .finally(async () => {
    try { if (staff) staff.client.realtime.disconnect(); } catch {}
    if (created.orgs.length) await admin.from("organizations").delete().in("id", created.orgs);
    for (const id of created.users) await admin.auth.admin.deleteUser(id).catch(() => {});
    console.log(`\n${failed === 0 ? "✅ PASS" : "❌ FAIL"} — ${passed} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  });

console.log("\u{1f373}  Kitchen Realtime checks\n");
