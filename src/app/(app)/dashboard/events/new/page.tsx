import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createEventAction } from "@/lib/events/actions";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm } from "../event-form";

export const metadata = { title: "New event" };

export default async function NewEventPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        New event
      </h1>
      <Card className="py-6">
        <CardContent>
          <EventForm
            action={createEventAction}
            submitLabel="Create event"
            showPublish
          />
        </CardContent>
      </Card>
    </div>
  );
}
