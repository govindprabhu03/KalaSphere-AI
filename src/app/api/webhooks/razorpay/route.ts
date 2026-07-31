import {
  isRazorpayWebhookConfigured,
  verifyRazorpayWebhook,
} from "@/lib/payments/razorpay";
import { fulfillEventPayment } from "@/lib/payments/fulfillment";

// Needs the Node runtime (node:crypto, service-role client) and must never be
// cached — every delivery is processed fresh.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayWebhook = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
  };
};

/**
 * Razorpay webhook — server-authoritative payment confirmation.
 *
 * This is belt-and-suspenders alongside the Checkout callback: if the user's
 * browser never fires the handler (closed the tab after paying, flaky network),
 * Razorpay still delivers `payment.captured` here and the ticket gets issued.
 *
 * Configure the endpoint URL + secret in the Razorpay dashboard, then set
 * RAZORPAY_WEBHOOK_SECRET. The signature is an HMAC of the RAW body, so we read
 * the body as text and verify before parsing.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isRazorpayWebhookConfigured()) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const raw = await req.text();
  if (!verifyRazorpayWebhook(raw, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let body: RazorpayWebhook;
  try {
    body = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  // A payment succeeded — issue the ticket (idempotent).
  if (body.event === "payment.captured" || body.event === "order.paid") {
    const payment = body.payload?.payment?.entity;
    const orderId = payment?.order_id ?? body.payload?.order?.entity?.id;
    const paymentId = payment?.id;
    if (orderId && paymentId) {
      await fulfillEventPayment({ orderId, paymentId });
    }
  }

  // Always 200 on a valid, verified delivery — including events we don't act on —
  // so Razorpay marks it delivered and doesn't retry.
  return new Response("ok", { status: 200 });
}
