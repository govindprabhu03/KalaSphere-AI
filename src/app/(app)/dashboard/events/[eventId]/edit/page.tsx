import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { updateEventAction } from "@/lib/events/actions";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm } from "../../event-form";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: e } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!e) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Edit event
      </h1>
      <Card className="py-6">
        <CardContent>
          <EventForm
            action={updateEventAction.bind(null, eventId)}
            submitLabel="Save changes"
            defaults={{
              title: e.title,
              category: e.category ?? undefined,
              location_text: e.location_text ?? undefined,
              description: e.description ?? undefined,
              startsLocal: e.starts_at?.slice(0, 16),
              endsLocal: e.ends_at?.slice(0, 16),
              capacity: e.capacity,
              priceRupees: e.price_cents / 100,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
