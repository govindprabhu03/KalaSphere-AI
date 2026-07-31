import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Ticket,
  Music2,
  GraduationCap,
  TrendingUp,
  Building2,
  UtensilsCrossed,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
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

type Module = { icon: LucideIcon; title: string; description: string; href: string };

/** Modules every member can reach, regardless of role. */
const MODULES: Module[] = [
  { icon: Sparkles, title: "AI Assistant", description: "Ask about your events, classes, bookings and more.", href: "/dashboard/assistant" },
  { icon: Ticket, title: "Events", description: "Browse events, register and get your QR tickets.", href: "/dashboard/events" },
  { icon: Music2, title: "Workshops", description: "Discover and enrol in upcoming workshops.", href: "/dashboard/workshops" },
  { icon: GraduationCap, title: "Cultural Classes", description: "Batches, attendance and enrolment.", href: "/dashboard/classes" },
  { icon: TrendingUp, title: "Growth", description: "Track student progress and skill assessments.", href: "/dashboard/growth" },
  { icon: Building2, title: "Venues", description: "Check availability and request bookings.", href: "/dashboard/venues" },
  { icon: UtensilsCrossed, title: "Canteen", description: "Browse the menu and place your order.", href: "/dashboard/canteen" },
  { icon: MessagesSquare, title: "Community", description: "News, announcements and the community board.", href: "/dashboard/community" },
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
          Explore
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.title}
                href={m.href}
                className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Card className="h-full transition-colors group-hover:border-ring/60">
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="mt-3">{m.title}</CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
