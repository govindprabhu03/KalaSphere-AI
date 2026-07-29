"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { setActiveOrgAction } from "@/lib/org/actions";
import { ROLE_LABELS, type OrgRole } from "@/lib/auth/roles";

type OrgOption = { id: string; name: string; role: OrgRole };

export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgOption[];
  activeOrgId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  function switchTo(id: string) {
    if (id === activeOrgId) return;
    startTransition(async () => {
      await setActiveOrgAction(id);
      router.refresh();
    });
  }

  if (orgs.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <span className="max-w-[9rem] truncate">{active?.name ?? "Select"}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onClick={() => switchTo(o.id)}
            className="justify-between"
          >
            <span className="truncate">{o.name}</span>
            <span className="ml-2 flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[o.role]}
              </span>
              {o.id === active?.id && <Check className="size-4 text-primary" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
