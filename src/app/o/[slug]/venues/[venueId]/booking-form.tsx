"use client";

import { useActionState } from "react";
import { requestBookingAction, type VenueState } from "@/lib/venues/actions";
import { FACILITIES } from "@/lib/venues/facilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BookingForm({ venueId }: { venueId: string }) {
  const [state, action, pending] = useActionState(
    requestBookingAction.bind(null, venueId),
    {} as VenueState,
  );

  if (state.message) {
    return <p className="text-sm font-medium text-emerald-600">{state.message}</p>;
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Purpose / event name</Label>
        <Input id="title" name="title" placeholder="Annual day rehearsal" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="starts_at">From</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ends_at">To</Label>
          <Input id="ends_at" name="ends_at" type="datetime-local" required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Facilities needed</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FACILITIES.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="facilities" value={f} className="size-4" />
              {f}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Requesting…" : "Request booking"}
        </Button>
      </div>
    </form>
  );
}
