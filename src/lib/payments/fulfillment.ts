import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-only. Idempotently mark a Razorpay payment as paid and issue the event
 * ticket. Shared by both confirmation paths:
 *   - the Checkout callback (after verifying the handler signature), and
 *   - the webhook (after verifying the webhook signature).
 * Either can arrive first (or both) — the `.neq` guard makes the ticket write
 * a no-op once a ticket already exists, so it's safe to run more than once.
 *
 * Writes go through the service-role client because the webhook has no user
 * session; callers MUST verify the relevant signature before calling this.
 */
export async function fulfillEventPayment(opts: {
  orderId: string;
  paymentId: string;
  /** When called from the browser flow, pin the payment to the session user. */
  expectedUserId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();

  const { data: pay } = await admin
    .from("payments")
    .select("id, registration_id, user_id, status")
    .eq("provider_order_id", opts.orderId)
    .maybeSingle();
  if (!pay) return { ok: false, reason: "payment record not found" };
  if (opts.expectedUserId && pay.user_id !== opts.expectedUserId) {
    return { ok: false, reason: "payment does not belong to this user" };
  }

  if (pay.status !== "paid") {
    await admin
      .from("payments")
      .update({ status: "paid", provider_payment_id: opts.paymentId })
      .eq("id", pay.id);
  }

  if (pay.registration_id) {
    const ticket = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    await admin
      .from("event_registrations")
      .update({ payment_status: "paid", ticket_code: ticket })
      .eq("id", pay.registration_id)
      .neq("payment_status", "paid");
  }

  return { ok: true };
}
