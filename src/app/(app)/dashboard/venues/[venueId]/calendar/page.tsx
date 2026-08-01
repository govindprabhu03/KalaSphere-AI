import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { MonthCalendar } from "@/components/month-calendar";

export const metadata = { title: "Venue calendar" };

export default async function VenueCalendarPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("*")
    .eq("id", venueId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!venue) notFound();

  const { data: busy } = await supabase.rpc("list_venue_busy", { p_venue: venueId });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/venues"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Venues
      </Link>
      <h1 className="mt-2 mb-1 font-heading text-2xl font-semibold tracking-tight">
        {venue.name}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Approved bookings. New requests appear under{" "}
        <Link href="/dashboard/bookings" className="text-primary hover:underline">
          Bookings
        </Link>
        .
      </p>
      <MonthCalendar bookings={busy ?? []} emptyLabel="Nothing booked this day." />
    </div>
  );
}
