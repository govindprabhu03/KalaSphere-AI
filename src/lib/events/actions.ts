"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOptionalContext } from "@/lib/auth/context";
import {
  isRazorpayConfigured,
  razorpayKeyId,
  createRazorpayOrder,
  verifyRazorpaySignature,
} from "@/lib/payments/razorpay";
import { fulfillEventPayment } from "@/lib/payments/fulfillment";

export type EventState = { error?: string; message?: string };

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function toIso(local: string | null): string | null {
  return local ? new Date(local + "Z").toISOString() : null;
}
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "event"}-${crypto.randomUUID().slice(0, 5)}`;
}

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

function eventFields(fd: FormData) {
  const capacityRaw = str(fd, "capacity");
  const priceRupees = Number(str(fd, "price") ?? "0") || 0;
  return {
    title: str(fd, "title"),
    startsLocal: str(fd, "starts_at"),
    description: str(fd, "description"),
    category: str(fd, "category"),
    location_text: str(fd, "location_text"),
    starts_at: toIso(str(fd, "starts_at")),
    ends_at: toIso(str(fd, "ends_at")),
    capacity: capacityRaw ? Math.max(1, Math.floor(Number(capacityRaw))) : null,
    price_cents: Math.max(0, Math.round(priceRupees * 100)),
  };
}

export async function createEventAction(
  _p: EventState,
  fd: FormData,
): Promise<EventState> {
  const ctx = await requireAdminOrg();
  const f = eventFields(fd);
  if (!f.title) return { error: "Title is required." };
  if (!f.starts_at) return { error: "Start date/time is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: ctx.activeOrgId!,
      slug: slugify(f.title),
      title: f.title,
      description: f.description,
      category: f.category,
      location_text: f.location_text,
      starts_at: f.starts_at,
      ends_at: f.ends_at,
      capacity: f.capacity,
      price_cents: f.price_cents,
      is_published: fd.get("publish") === "on",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/events");
  redirect(`/dashboard/events/${data.id}`);
}

export async function updateEventAction(
  eventId: string,
  _p: EventState,
  fd: FormData,
): Promise<EventState> {
  const ctx = await requireAdminOrg();
  const f = eventFields(fd);
  if (!f.title) return { error: "Title is required." };
  if (!f.starts_at) return { error: "Start date/time is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title: f.title,
      description: f.description,
      category: f.category,
      location_text: f.location_text,
      starts_at: f.starts_at,
      ends_at: f.ends_at,
      capacity: f.capacity,
      price_cents: f.price_cents,
    })
    .eq("id", eventId)
    .eq("organization_id", ctx.activeOrgId!);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  return { message: "Saved." };
}

export async function setEventPublishedAction(eventId: string, published: boolean) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ is_published: published })
    .eq("id", eventId)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/events");
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function deleteEventAction(eventId: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function registerForEventAction(eventId: string): Promise<EventState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("price_cents, is_published")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || !ev.is_published) {
    return { error: "This event is not open for registration." };
  }
  if (ev.price_cents > 0 && !isRazorpayConfigured()) {
    return {
      error:
        "This is a paid event — online payment isn't set up yet. Please check back soon.",
    };
  }

  const { error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/tickets");
  redirect("/dashboard/tickets");
}

// ---------------------------------------------------------------------------
// Paid events — Razorpay checkout (gated on RAZORPAY_KEY_ID + KEY_SECRET).
// Flow: createEventOrderAction -> Razorpay Checkout (client) -> Razorpay calls
// back to the browser -> confirmEventPaymentAction verifies the signature
// server-side and only then issues the ticket. The "grant a ticket" write is
// never exposed to the client — it runs through the service-role client after
// the signature check, so a user can't mark themselves paid without paying.
// ---------------------------------------------------------------------------

export type EventOrder = {
  error?: string;
  keyId?: string;
  orderId?: string;
  amountCents?: number;
  currency?: string;
  orgName?: string;
  eventTitle?: string;
  prefillName?: string;
  prefillEmail?: string;
};

export async function createEventOrderAction(eventId: string): Promise<EventOrder> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!isRazorpayConfigured()) {
    return { error: "Online payment isn't set up yet. Please check back soon." };
  }

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("id, title, price_cents, currency, is_published, organization_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || !ev.is_published) {
    return { error: "This event is not open for registration." };
  }
  if (ev.price_cents <= 0) {
    return { error: "This is a free event — just register." };
  }

  // Ensure a (pending) registration exists for this user.
  const { data: reg, error: regErr } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
  });
  if (regErr) return { error: regErr.message };
  if (!reg) return { error: "Could not start registration." };
  if (reg.payment_status === "paid") {
    return { error: "You've already paid for this event." };
  }

  // Create the Razorpay order, then record a 'created' payment row (service role).
  let order;
  try {
    order = await createRazorpayOrder({
      amountCents: ev.price_cents,
      currency: ev.currency,
      receipt: `reg_${reg.id}`.slice(0, 40),
      notes: { event_id: ev.id, registration_id: reg.id, user_id: ctx.user.id },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start payment." };
  }

  const admin = createAdminClient();
  await admin.from("payments").insert({
    organization_id: ev.organization_id,
    user_id: ctx.user.id,
    registration_id: reg.id,
    provider: "razorpay",
    provider_order_id: order.id,
    amount_cents: ev.price_cents,
    currency: ev.currency,
    status: "created",
  });

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", ev.organization_id)
    .maybeSingle();

  const meta = (ctx.user.user_metadata ?? {}) as { full_name?: string };
  return {
    keyId: razorpayKeyId(),
    orderId: order.id,
    amountCents: ev.price_cents,
    currency: ev.currency,
    orgName: org?.name ?? "KalaSphere AI",
    eventTitle: ev.title,
    prefillName: meta.full_name,
    prefillEmail: ctx.user.email ?? undefined,
  };
}

export async function confirmEventPaymentAction(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<EventState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const ok = verifyRazorpaySignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });
  if (!ok) return { error: "Payment could not be verified." };

  // The webhook confirms this too (server-authoritative); whichever lands first
  // issues the ticket, the other is a safe no-op.
  const res = await fulfillEventPayment({
    orderId: input.orderId,
    paymentId: input.paymentId,
    expectedUserId: ctx.user.id,
  });
  if (!res.ok) return { error: "Payment record not found." };

  revalidatePath("/dashboard/tickets");
  return { message: "Payment successful — your ticket is ready." };
}

export async function checkInAction(
  _p: EventState,
  fd: FormData,
): Promise<EventState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  const code = str(fd, "code");
  if (!code) return { error: "Enter a ticket code." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", { p_code: code });
  if (error) return { error: error.message };
  const row = data?.[0];
  if (!row) return { error: "Ticket not found." };

  return {
    message: row.already
      ? `Already checked in: ${row.attendee} — ${row.event_title}`
      : `Checked in: ${row.attendee} — ${row.event_title}`,
  };
}
