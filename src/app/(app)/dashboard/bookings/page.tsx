import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { decideBookingAction } from "@/lib/venues/actions";
import { formatEventDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Bookings" };

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "approved" ? "default" : status === "requested" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export default async function BookingsPage() {
  const ctx = await requireContext();
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";
  const supabase = await createClient();

  if (isAdmin) {
    const { data } = await supabase.rpc("list_org_bookings", { p_org: ctx.activeOrgId! });
    const rows = data ?? [];
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Venue bookings</h1>
        {rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No booking requests yet.</Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((b) => (
              <Card key={b.booking_id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.title}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.venue_name} · {formatEventDateTime(b.starts_at)} → {formatEventDateTime(b.ends_at)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      By {b.requester}
                      {b.facilities.length ? ` · ${b.facilities.join(", ")}` : ""}
                    </p>
                    {b.notes && <p className="mt-1 text-sm">{b.notes}</p>}
                  </div>
                  {b.status === "requested" && (
                    <div className="flex gap-2">
                      <form action={decideBookingAction.bind(null, b.booking_id, true)}>
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <form action={decideBookingAction.bind(null, b.booking_id, false)}>
                        <Button type="submit" size="sm" variant="outline">Reject</Button>
                      </form>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Non-admin: their own booking requests
  const { data: mine } = await supabase
    .from("venue_bookings")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });
  const rows = mine ?? [];
  const venueIds = [...new Set(rows.map((r) => r.venue_id))];
  const { data: venues } = await supabase.from("venues").select("id, name").in("id", venueIds);
  const vname = new Map((venues ?? []).map((v) => [v.id, v.name]));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">My bookings</h1>
      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t requested any bookings yet.
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.title}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {vname.get(b.venue_id) ?? "Venue"} · {formatEventDateTime(b.starts_at)} → {formatEventDateTime(b.ends_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
