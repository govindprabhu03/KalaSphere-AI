"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr } from "@/lib/form-utils";

export type CanteenState = { error?: string; message?: string };

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

export async function addMenuItemAction(
  _p: CanteenState,
  fd: FormData,
): Promise<CanteenState> {
  const ctx = await requireAdminOrg();
  const name = fstr(fd, "name");
  if (!name) return { error: "Item name is required." };
  const price = Number(fstr(fd, "price") ?? "0") || 0;

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    organization_id: ctx.activeOrgId!,
    name,
    description: fstr(fd, "description"),
    category: fstr(fd, "category"),
    price_cents: Math.max(0, Math.round(price * 100)),
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/canteen");
  return { message: `${name} added.` };
}

export async function toggleMenuItemAction(id: string, available: boolean) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("menu_items")
    .update({ is_available: available })
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/canteen");
}

export async function deleteMenuItemAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/canteen");
}

export async function placeOrderAction(
  org: string,
  items: { menu_item_id: string; qty: number }[],
): Promise<CanteenState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_org: org,
    p_items: items,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/orders");
  return { message: `Order placed! Your number is #${data.order_number}.` };
}

export async function advanceOrderAction(orderId: string, status: string) {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  const supabase = await createClient();
  await supabase.rpc("update_order_status", { p_order: orderId, p_status: status });
  revalidatePath("/dashboard/kitchen");
}
