import { MobileNav } from "@/components/app/mobile-nav";
import { OrgSwitcher } from "@/components/app/org-switcher";
import { UserMenu } from "@/components/app/user-menu";
import type { AppRole, OrgRole } from "@/lib/auth/roles";

type OrgOption = { id: string; name: string; role: OrgRole };

export function Topbar({
  role,
  orgName,
  orgs,
  activeOrgId,
  userName,
  userEmail,
  avatarUrl,
  roleLabel,
}: {
  role: AppRole;
  orgName: string | null;
  orgs: OrgOption[];
  activeOrgId: string | null;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  roleLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <MobileNav role={role} orgName={orgName} />
        <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} />
      </div>
      <UserMenu
        name={userName}
        email={userEmail}
        avatarUrl={avatarUrl}
        roleLabel={roleLabel}
      />
    </header>
  );
}
