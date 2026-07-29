import { SidebarNav } from "@/components/app/sidebar-nav";
import type { AppRole } from "@/lib/auth/roles";

export function AppSidebar({
  role,
  orgName,
}: {
  role: AppRole;
  orgName: string | null;
}) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 text-xs font-bold text-white">
          RB
        </span>
        <p className="truncate font-heading text-sm font-semibold">
          {orgName ?? "KalaSphere"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav role={role} />
      </div>
    </aside>
  );
}
