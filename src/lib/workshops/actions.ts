"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { fstr, toIso, slugify } from "@/lib/form-utils";

export type WorkshopState = { error?: string; message?: string };

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

function fields(fd: FormData) {
  const capacityRaw = fstr(fd, "capacity");
  const priceRupees = Number(fstr(fd, "price") ?? "0") || 0;
  return {
    title: fstr(fd, "title"),
    description: fstr(fd, "description"),
    category: fstr(fd, "category"),
    starts_at: toIso(fstr(fd, "starts_at")),
    ends_at: toIso(fstr(fd, "ends_at")),
    capacity: capacityRaw ? Math.max(1, Math.floor(Number(capacityRaw))) : null,
    price_cents: Math.max(0, Math.round(priceRupees * 100)),
  };
}

export async function createWorkshopAction(
  _p: WorkshopState,
  fd: FormData,
): Promise<WorkshopState> {
  const ctx = await requireAdminOrg();
  const f = fields(fd);
  if (!f.title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshops")
    .insert({
      organization_id: ctx.activeOrgId!,
      slug: slugify(f.title, "workshop"),
      title: f.title,
      description: f.description,
      category: f.category,
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

  revalidatePath("/dashboard/workshops");
  redirect(`/dashboard/workshops/${data.id}`);
}

export async function updateWorkshopAction(
  id: string,
  _p: WorkshopState,
  fd: FormData,
): Promise<WorkshopState> {
  const ctx = await requireAdminOrg();
  const f = fields(fd);
  if (!f.title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workshops")
    .update({
      title: f.title,
      description: f.description,
      category: f.category,
      starts_at: f.starts_at,
      ends_at: f.ends_at,
      capacity: f.capacity,
      price_cents: f.price_cents,
    })
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/workshops/${id}`);
  return { message: "Saved." };
}

export async function setWorkshopPublishedAction(id: string, published: boolean) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("workshops")
    .update({ is_published: published })
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/workshops");
  revalidatePath(`/dashboard/workshops/${id}`);
}

export async function deleteWorkshopAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("workshops")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/workshops");
  redirect("/dashboard/workshops");
}

export async function enrollInWorkshopAction(
  workshopId: string,
): Promise<WorkshopState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workshops")
    .select("price_cents, is_published")
    .eq("id", workshopId)
    .maybeSingle();
  if (!w || !w.is_published) return { error: "This workshop is not open." };
  if (w.price_cents > 0 && !isRazorpayConfigured()) {
    return { error: "Paid workshops need payment setup — coming soon." };
  }

  const { error } = await supabase.rpc("enroll_in_workshop", {
    p_workshop_id: workshopId,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { message: "You're enrolled! 🎉" };
}
