import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { deleteVenueAction } from "@/lib/venues/actions";
import { formatMoney } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Venues" };

export default async function VenuesPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Venues</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spaces people can book. Requests appear under Bookings.
          </p>
        </div>
        <Link href="/dashboard/venues/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" /> New venue
        </Link>
      </div>

      {(venues ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No venues yet.</Card>
      ) : (
        <div className="grid gap-3">
          {(venues ?? []).map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{v.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {v.capacity ? `Capacity ${v.capacity} · ` : ""}
                    {formatMoney(v.base_rate_cents, "INR")}
                  </p>
                  {v.facilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.facilities.map((f) => (
                        <Badge key={f} variant="secondary">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <form action={deleteVenueAction.bind(null, v.id)}>
                  <Button type="submit" variant="ghost" size="sm">Delete</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
