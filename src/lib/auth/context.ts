import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, OrgRole } from "@/lib/auth/roles";

/** Cookie that remembers which organization the user is currently acting in. */
export const ACTIVE_ORG_COOKIE = "active_org";

export type Membership = {
  organizationId: string;
  role: OrgRole;
  status: string;
};

export type AuthContext = {
  user: User;
  isPlatformAdmin: boolean;
  memberships: Membership[];
  /** The org the user is currently acting in (from cookie, else first membership). */
  activeOrgId: string | null;
  /** Effective role in the active org: super_admin > org role > public. */
  role: AppRole;
};

/**
 * Resolves the signed-in user, their memberships, and their active org.
 * Returns null when there is no session. Every query here runs under RLS.
 */
export async function getOptionalContext(): Promise<AuthContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membershipRows } = await supabase
    .from("organization_members")
    .select("organization_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  const memberships: Membership[] = (membershipRows ?? []).map((m) => ({
    organizationId: m.organization_id,
    role: m.role as OrgRole,
    status: m.status,
  }));

  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  const cookieStore = await cookies();
  const cookieOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const activeOrgId =
    (cookieOrg && memberships.some((m) => m.organizationId === cookieOrg)
      ? cookieOrg
      : null) ??
    memberships[0]?.organizationId ??
    null;

  const role: AppRole = isPlatformAdmin
    ? "super_admin"
    : (memberships.find((m) => m.organizationId === activeOrgId)?.role ??
      "public");

  return { user, isPlatformAdmin, memberships, activeOrgId, role };
}

/**
 * Like getOptionalContext, but redirects unauthenticated users to /login.
 * Use as the per-request gate for authenticated pages and actions.
 */
export async function requireContext(): Promise<AuthContext> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  return ctx;
}
