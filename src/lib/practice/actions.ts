"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr } from "@/lib/form-utils";

export type PracticeState = { error?: string; message?: string };

async function requireStaff() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || !["admin", "faculty", "super_admin"].includes(ctx.role)) {
    redirect("/dashboard");
  }
  return ctx;
}

export async function createPracticeItemAction(
  batchId: string,
  _p: PracticeState,
  fd: FormData,
): Promise<PracticeState> {
  const ctx = await requireStaff();
  const title = fstr(fd, "title");
  if (!title) return { error: "Title is required." };

  const dayRaw = fstr(fd, "day_of_week");
  const day = dayRaw === null || dayRaw === "" ? null : Number(dayRaw);
  const durRaw = fstr(fd, "duration_min");
  const duration = durRaw ? Math.max(1, Math.round(Number(durRaw))) : null;

  const supabase = await createClient();
  const { error } = await supabase.from("practice_items").insert({
    batch_id: batchId,
    organization_id: ctx.activeOrgId!,
    title,
    notes: fstr(fd, "notes"),
    day_of_week: day !== null && day >= 0 && day <= 6 ? day : null,
    duration_min: duration,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/batch/${batchId}`);
  return { message: "Added to the practice plan." };
}

export async function deletePracticeItemAction(itemId: string, batchId: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("practice_items")
    .delete()
    .eq("id", itemId)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath(`/dashboard/classes/batch/${batchId}`);
}
