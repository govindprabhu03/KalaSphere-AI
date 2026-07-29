import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("starts_at", { ascending: false });
  const rows = events ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage your organization&apos;s events.
          </p>
        </div>
        <Link href="/dashboard/events/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" /> New event
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No events yet. Create your first one.
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((e) => (
            <Link key={e.id} href={`/dashboard/events/${e.id}`} className="block">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{e.title}</span>
                      <Badge variant={e.is_published ? "default" : "secondary"}>
                        {e.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatEventDateTime(e.starts_at)}
                      {e.location_text ? ` · ${e.location_text}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {formatMoney(e.price_cents, e.currency)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
