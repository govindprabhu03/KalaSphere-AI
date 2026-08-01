import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { formatMoney } from "@/lib/format";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { MonthCalendar } from "@/components/month-calendar";
import { BookingForm } from "./booking-form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PublicVenuePage({
  params,
}: {
  params: Promise<{ slug: string; venueId: string }>;
}) {
  const { slug, venueId } = await params;
  const supabase = await createClient();

  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: venue } = await supabase
    .from("venues")
    .select("*")
    .eq("id", venueId)
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!venue) notFound();

  const { data: busy } = await supabase.rpc("list_venue_busy", { p_venue: venueId });
  const busyRows = busy ?? [];
  const ctx = await getOptionalContext();

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}/venues`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Venues
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{venue.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {venue.capacity ? `Capacity ${venue.capacity} · ` : ""}
          {formatMoney(venue.base_rate_cents, "INR")}
        </p>
        {venue.facilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {venue.facilities.map((f) => (
              <Badge key={f} variant="secondary">{f}</Badge>
            ))}
          </div>
        )}
        {venue.description && (
          <p className="mt-4 text-sm whitespace-pre-wrap">{venue.description}</p>
        )}

        <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Availability</h2>
        <MonthCalendar bookings={busyRows} />

        <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Request a booking</h2>
        {!ctx ? (
          <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
            Log in to request
          </Link>
        ) : (
          <Card className="p-5">
            <BookingForm venueId={venue.id} />
          </Card>
        )}
      </main>
    </>
  );
}
