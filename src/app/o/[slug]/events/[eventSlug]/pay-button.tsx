"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  createEventOrderAction,
  confirmEventPaymentAction,
} from "@/lib/events/actions";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (r: RazorpayResponse) => void;
};
type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Load Razorpay's hosted Checkout script once, on demand. */
function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Razorpay.")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay."));
    document.body.appendChild(s);
  });
}

export function PayButton({
  eventId,
  priceLabel,
}: {
  eventId: string;
  priceLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const order = await createEventOrderAction(eventId);
      if (order.error || !order.orderId || !order.keyId) {
        setError(order.error ?? "Could not start payment.");
        return;
      }
      try {
        await loadCheckout();
      } catch {
        setError("Could not load the payment window. Check your connection.");
        return;
      }
      if (!window.Razorpay) {
        setError("Payment is unavailable right now.");
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountCents ?? 0,
        currency: order.currency ?? "INR",
        name: order.orgName ?? "KalaSphere AI",
        description: order.eventTitle,
        prefill: { name: order.prefillName, email: order.prefillEmail },
        theme: { color: "#6d28d9" },
        handler: (resp) => {
          startTransition(async () => {
            const res = await confirmEventPaymentAction({
              orderId: resp.razorpay_order_id,
              paymentId: resp.razorpay_payment_id,
              signature: resp.razorpay_signature,
            });
            if (res?.error) setError(res.error);
            else window.location.href = "/dashboard/tickets";
          });
        },
      });
      rzp.open();
    });
  }

  return (
    <div>
      <Button size="lg" disabled={pending} onClick={pay}>
        {pending ? "Starting…" : `Pay & register · ${priceLabel}`}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
