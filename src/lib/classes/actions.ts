"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr, slugify } from "@/lib/form-utils";

export type ClassState = { error?: string; message?: string };

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

async function requireStaffOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (
    !ctx.activeOrgId ||
    !["admin", "faculty", "super_admin"].includes(ctx.role)
  ) {
    redirect("/dashboard");
  }
  return ctx;
}

// --- Classes ---
export async function createClassAction(
  _p: ClassState,
  fd: FormData,
): Promise<ClassState> {
  const ctx = await requireAdminOrg();
  const title = fstr(fd, "title");
  if (!title) return { error: "Title is required." };
  const feeRupees = Number(fstr(fd, "fee") ?? "0") || 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({
      organization_id: ctx.activeOrgId!,
      slug: slugify(title, "class"),
      title,
      description: fstr(fd, "description"),
      discipline: fstr(fd, "discipline"),
      fee_cents: Math.max(0, Math.round(feeRupees * 100)),
      is_published: fd.get("publish") === "on",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/classes");
  redirect(`/dashboard/classes/${data.id}`);
}

export async function updateClassAction(
  classId: string,
  _p: ClassState,
  fd: FormData,
): Promise<ClassState> {
  const ctx = await requireAdminOrg();
  const title = fstr(fd, "title");
  if (!title) return { error: "Title is required." };
  const feeRupees = Number(fstr(fd, "fee") ?? "0") || 0;

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      title,
      description: fstr(fd, "description"),
      discipline: fstr(fd, "discipline"),
      fee_cents: Math.max(0, Math.round(feeRupees * 100)),
    })
    .eq("id", classId)
    .eq("organization_id", ctx.activeOrgId!);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${classId}`);
  return { message: "Saved." };
}

export async function setClassPublishedAction(id: string, published: boolean) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("classes")
    .update({ is_published: published })
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/classes/${id}`);
}

export async function deleteClassAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/classes");
  redirect("/dashboard/classes");
}

// --- Batches ---
export async function createBatchAction(
  classId: string,
  _p: ClassState,
  fd: FormData,
): Promise<ClassState> {
  const ctx = await requireAdminOrg();
  const name = fstr(fd, "name");
  if (!name) return { error: "Batch name is required." };
  const capacityRaw = fstr(fd, "capacity");

  const supabase = await createClient();
  const { error } = await supabase.from("batches").insert({
    class_id: classId,
    organization_id: ctx.activeOrgId!,
    name,
    schedule_text: fstr(fd, "schedule_text"),
    capacity: capacityRaw ? Math.max(1, Math.floor(Number(capacityRaw))) : null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/${classId}`);
  return { message: `Batch "${name}" added.` };
}

export async function deleteBatchAction(batchId: string, classId: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase
    .from("batches")
    .delete()
    .eq("id", batchId)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath(`/dashboard/classes/${classId}`);
}

// --- Sessions + attendance (admin/faculty) ---
export async function createSessionAction(
  batchId: string,
  _p: ClassState,
  fd: FormData,
): Promise<ClassState> {
  const ctx = await requireStaffOrg();
  const date = fstr(fd, "session_date");
  if (!date) return { error: "Session date is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").insert({
    batch_id: batchId,
    organization_id: ctx.activeOrgId!,
    title: fstr(fd, "title"),
    session_date: date,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/batch/${batchId}`);
  return { message: "Session added." };
}

export async function markAttendanceAction(
  sessionId: string,
  studentId: string,
  present: boolean,
  batchId: string,
) {
  await requireStaffOrg();
  const supabase = await createClient();
  await supabase.rpc("mark_class_attendance", {
    p_session_id: sessionId,
    p_student: studentId,
    p_present: present,
  });
  revalidatePath(`/dashboard/classes/batch/${batchId}`);
}

// --- Student enrollment (any signed-in user) ---
export async function enrollInClassAction(batchId: string): Promise<ClassState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_in_class", {
    p_batch_id: batchId,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { message: "You're enrolled! 🎉" };
}
