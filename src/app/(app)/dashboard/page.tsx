import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Users, Ticket, Music2, Building2, UtensilsCrossed } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { ROLE_LABELS } from "@/lib/auth/roles";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

type ComingSoon = { icon: LucideIcon; title: string; description: string };

const COMING_SOON: ComingSoon[] = [
  { icon: Ticket, title: "Events", description: "Create events, take registrations and payments (Phase 2)." },
  { icon: Music2, title: "Cultural Classes", description: "Batches, attendance and student growth (Phase 3–4)." },
  { icon: Building2, title: "Venue Booking", description: "Availability calendar and approvals (Phase 5)." },
  { icon: UtensilsCrossed, title: "Canteen", description: "Menu, orders and kitchen board (Phase 6)." },
];

export default async function DashboardPage() {
  const ctx = await requireContext();
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in as{" "}
          <span className="font-medium text-foreground">
            {ROLE_LABELS[ctx.role]}
          </span>
          .
        </p>
      </div>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manage your team</CardTitle>
            <CardDescription>
              Add faculty, students, parents and artists to your organization
              and assign their roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/members"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <Users className="size-4" />
              Go to Members
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Coming soon
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COMING_SOON.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.title} className="opacity-80">
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="mt-3">{m.title}</CardTitle>
                  <CardDescription>{m.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
