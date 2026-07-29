"use client";

import { useActionState } from "react";
import { createVenueAction, type VenueState } from "@/lib/venues/actions";
import { FACILITIES } from "@/lib/venues/facilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VenueForm() {
  const [state, action, pending] = useActionState(createVenueAction, {} as VenueState);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Venue name</Label>
        <Input id="name" name="name" placeholder="Main Auditorium" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" min="1" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rate">Rate (₹ per booking)</Label>
          <Input id="rate" name="rate" type="number" min="0" defaultValue={0} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Facilities available</Label>
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
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create venue"}
        </Button>
      </div>
    </form>
  );
}
