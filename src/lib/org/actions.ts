"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext, ACTIVE_ORG_COOKIE } from "@/lib/auth/context";
import { createOrgSchema, addMemberSchema } from "@/lib/validation";

export type ActionState = { error?: string; message?: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "org"}-${suffix}`;
}

async function setActiveOrgCookie(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");

  const parsed = createOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", {
    org_name: parsed.data.name,
    org_slug: slugify(parsed.data.name),
  });
  if (error) return { error: error.message };

  if (data) await setActiveOrgCookie(data.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function setActiveOrgAction(orgId: string) {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.memberships.some((m) => m.organizationId === orgId)) return;

  await setActiveOrgCookie(orgId);
  revalidatePath("/", "layout");
}

export async function addMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId) return { error: "No active organization." };

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_member_by_email", {
    org: ctx.activeOrgId,
    member_email: parsed.data.email,
    member_role: parsed.data.role,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/members");
  return { message: `${parsed.data.email} added as ${parsed.data.role}.` };
}

export async function updateMemberRoleAction(memberId: string, formData: FormData) {
  const ctx = await getOptionalContext();
  if (!ctx || !ctx.activeOrgId) redirect("/login");

  const role = String(formData.get("role") ?? "");
  if (!["admin", "faculty", "parent", "student", "artist"].includes(role)) return;

  const supabase = await createClient();
  await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", ctx.activeOrgId);

  revalidatePath("/dashboard/members");
}

export async function removeMemberAction(memberId: string) {
  const ctx = await getOptionalContext();
  if (!ctx || !ctx.activeOrgId) redirect("/login");
  if (memberId === "") return;

  const supabase = await createClient();
  await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", ctx.activeOrgId)
    .neq("user_id", ctx.user.id); // don't let an admin remove themselves here

  revalidatePath("/dashboard/members");
}
