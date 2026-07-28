import type { LucideIcon } from "lucide-react";
import {
  Ticket,
  GraduationCap,
  Music2,
  LineChart,
  Building2,
  UtensilsCrossed,
  Users,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Hero } from "@/components/site/hero";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type ModuleItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const MODULES: ModuleItem[] = [
  { icon: Ticket, title: "Events", description: "Register, pay, get a QR ticket, check in, earn certificates." },
  { icon: GraduationCap, title: "Workshops", description: "Enroll, attend, and receive certificates automatically." },
  { icon: Music2, title: "Cultural Classes", description: "Batches, attendance, assignments and practice schedules." },
  { icon: LineChart, title: "Student Growth", description: "Monthly evaluations turned into progress charts for parents." },
  { icon: Building2, title: "Venue Booking", description: "Live availability calendar, facilities, approvals and receipts." },
  { icon: UtensilsCrossed, title: "Canteen", description: "Browse the menu, order, pay, and track it to the kitchen." },
  { icon: Users, title: "Community", description: "Artist profiles, portfolios, auditions and collaboration." },
  { icon: Sparkles, title: "AI Assistant", description: "Ask about events, get recommendations, and smart insights." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />

        <section id="modules" className="mx-auto max-w-6xl px-4 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything a Ravindra Bhavan needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              One platform, delivered module by module — each built on a secure,
              multi-tenant foundation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <Card
                  key={m.title}
                  className="transition-shadow duration-200 hover:shadow-md"
                >
                  <CardHeader>
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="mt-3">{m.title}</CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="about" className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for the community, expandable to all of Goa
            </h2>
            <p className="mt-3 text-muted-foreground">
              A multi-tenant system: one codebase can serve every Ravindra Bhavan,
              each with its own branding, users, events and data — kept strictly
              separate at the database level.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-violet-500" />
              Phase 0 · Foundation ready
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
