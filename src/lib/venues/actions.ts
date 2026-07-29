"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr, toIso } from "@/lib/form-utils";

export type VenueState = { error?: string; message?: string };

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

export async function createVenueAction(
  _p: VenueState,
  fd: FormData,
): Promise<VenueState> {
  const ctx = await requireAdminOrg();
  const name = fstr(fd, "name");
  if (!name) return { error: "Venue name is required." };
  const capRaw = fstr(fd, "capacity");
  const rate = Number(fstr(fd, "rate") ?? "0") || 0;
  const facilities = (fd.getAll("facilities") as string[]).filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.from("venues").insert({
    organization_id: ctx.activeOrgId!,
    name,
    description: fstr(fd, "description"),
    capacity: capRaw ? Math.max(1, Math.floor(Number(capRaw))) : null,
    base_rate_cents: Math.max(0, Math.round(rate * 100)),
    facilities,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/venues");
  redirect("/dashboard/venues");
}

export async function deleteVenueAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("venues")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/venues");
}

export async function requestBookingAction(
  venueId: string,
  _p: VenueState,
  fd: FormData,
): Promise<VenueState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const title = fstr(fd, "title");
  const startsLocal = fstr(fd, "starts_at");
  const endsLocal = fstr(fd, "ends_at");
  if (!title) return { error: "Enter a title / purpose." };
  if (!startsLocal || !endsLocal) return { error: "Enter start and end times." };
  const facilities = (fd.getAll("facilities") as string[]).filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_booking", {
    p_venue: venueId,
    p_starts: toIso(startsLocal)!,
    p_ends: toIso(endsLocal)!,
    p_title: title,
    p_facilities: facilities,
    p_notes: fstr(fd, "notes") ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/bookings");
  return { message: "Booking requested — you'll be notified once it's reviewed." };
}

export async function decideBookingAction(bookingId: string, approve: boolean) {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  const supabase = await createClient();
  await supabase.rpc("decide_booking", { p_booking: bookingId, p_approve: approve });
  revalidatePath("/dashboard/bookings");
}
