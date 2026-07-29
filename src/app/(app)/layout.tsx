import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type OrgRole } from "@/lib/auth/roles";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  if (!ctx.activeOrgId && !ctx.isPlatformAdmin) redirect("/onboarding");

  const supabase = await createClient();

  const orgIds = ctx.memberships.map((m) => m.organizationId);
  const orgsById = new Map<string, string>();
  if (orgIds.length) {
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);
    for (const o of data ?? []) orgsById.set(o.id, o.name);
  }

  const orgs = ctx.memberships.map((m) => ({
    id: m.organizationId,
    name: orgsById.get(m.organizationId) ?? "Organization",
    role: m.role as OrgRole,
  }));

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const activeOrgName = ctx.activeOrgId
    ? (orgsById.get(ctx.activeOrgId) ?? null)
    : null;
  const userName =
    profile?.full_name ?? ctx.user.email?.split("@")[0] ?? "User";

  return (
    <div className="flex min-h-svh">
      <AppSidebar role={ctx.role} orgName={activeOrgName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          role={ctx.role}
          orgName={activeOrgName}
          orgs={orgs}
          activeOrgId={ctx.activeOrgId}
          userName={userName}
          userEmail={ctx.user.email ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          roleLabel={ROLE_LABELS[ctx.role]}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
