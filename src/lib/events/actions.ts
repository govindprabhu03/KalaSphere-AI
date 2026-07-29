"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

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
