/**
 * Razorpay server helpers. Paid flows stay disabled until real keys are present,
 * so free events work now and paid checkout lights up the moment both keys are
 * added (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env.local).
 *
 * Server-only: reads RAZORPAY_KEY_SECRET. Never import into a Client Component.
 */
import crypto from "node:crypto";

export function isRazorpayConfigured(): boolean {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return (
    id.length > 0 &&
    secret.length > 0 &&
    !id.includes("REPLACE") &&
    !secret.includes("REPLACE")
  );
}

/** The publishable Key ID — safe to hand to the browser for Checkout. */
export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

/**
 * Create a Razorpay order (server-to-server, Basic auth). `amountCents` is the
 * amount in the smallest currency unit (paise for INR) — the same integer we
 * store in `price_cents`. Throws if Razorpay isn't configured or the API errors.
 */
export async function createRazorpayOrder(opts: {
  amountCents: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!id || !secret) throw new Error("Razorpay is not configured.");

  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amountCents,
      currency: opts.currency ?? "INR",
      receipt: opts.receipt,
      notes: opts.notes,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify the signature Razorpay Checkout returns to the browser. This is the
 * server-side gate that proves a payment really happened before we issue a
 * ticket — a client can't forge it without the secret. Timing-safe compare.
 */
export function verifyRazorpaySignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!secret || !opts.signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
