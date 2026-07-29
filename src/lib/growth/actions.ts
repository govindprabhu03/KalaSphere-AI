"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";

export type GrowthState = { error?: string; message?: string };

function score(fd: FormData, k: string): number {
  const v = Number(fd.get(k));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

export async function upsertEvaluationAction(
  batchId: string,
  studentId: string,
  _p: GrowthState,
  fd: FormData,
): Promise<GrowthState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const period = String(fd.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Pick a valid month." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("upsert_evaluation", {
    p_batch_id: batchId,
    p_student: studentId,
    p_period: period,
    p_pitch: score(fd, "pitch"),
    p_rhythm: score(fd, "rhythm"),
    p_voice: score(fd, "voice"),
    p_confidence: score(fd, "confidence"),
    p_coordination: score(fd, "coordination"),
    p_expression: score(fd, "expression"),
    p_practice: score(fd, "practice"),
    p_attendance: score(fd, "attendance"),
    p_performance: score(fd, "performance"),
    p_remarks: String(fd.get("remarks") ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/growth/${studentId}`);
  return { message: "Evaluation saved." };
}

export async function linkParentAction(
  studentId: string,
  _p: GrowthState,
  fd: FormData,
): Promise<GrowthState> {
  const ctx = await getOptionalContext();
  if (!ctx || !ctx.activeOrgId) redirect("/login");

  const email = String(fd.get("email") ?? "").trim();
  if (!email) return { error: "Enter the parent's email." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("link_parent_to_student", {
    p_org: ctx.activeOrgId,
    p_parent_email: email,
    p_student: studentId,
  });
  if (error) return { error: error.message };
  return { message: "Parent linked ✓" };
}
