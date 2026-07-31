"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr } from "@/lib/form-utils";

export type AssignmentState = { error?: string; message?: string };

async function requireStaff() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || !["admin", "faculty", "super_admin"].includes(ctx.role)) {
    redirect("/dashboard");
  }
  return ctx;
}

// --- Faculty: create / delete an assignment for a batch ---
export async function createAssignmentAction(
  batchId: string,
  _p: AssignmentState,
  fd: FormData,
): Promise<AssignmentState> {
  const ctx = await requireStaff();
  const title = fstr(fd, "title");
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    batch_id: batchId,
    organization_id: ctx.activeOrgId!,
    title,
    description: fstr(fd, "description"),
    due_date: fstr(fd, "due_date"),
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/classes/batch/${batchId}`);
  return { message: "Assignment added." };
}

export async function deleteAssignmentAction(assignmentId: string, batchId: string) {
  const ctx = await requireStaff();
  const supabase = await createClient();
  await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("organization_id", ctx.activeOrgId!);
  revalidatePath(`/dashboard/classes/batch/${batchId}`);
}

// --- Faculty: grade a submission ---
export async function gradeAssignmentAction(
  submissionId: string,
  _p: AssignmentState,
  fd: FormData,
): Promise<AssignmentState> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("grade_assignment", {
    p_submission_id: submissionId,
    p_grade: fstr(fd, "grade") ?? "",
    p_feedback: fstr(fd, "feedback") ?? "",
  });
  if (error) return { error: error.message };
  return { message: "Saved." };
}

// --- Student: submit (or resubmit) an assignment ---
export async function submitAssignmentAction(
  assignmentId: string,
  _p: AssignmentState,
  fd: FormData,
): Promise<AssignmentState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const content = fstr(fd, "content") ?? "";
  const attachment = fstr(fd, "attachment_url") ?? "";
  if (!content && !attachment) {
    return { error: "Add a note or attach a file before submitting." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_assignment", {
    p_assignment_id: assignmentId,
    p_content: content,
    p_attachment_url: attachment,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/assignments");
  return { message: "Submitted — your teacher will review it." };
}
