"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkshopState } from "@/lib/workshops/actions";

export type WorkshopDefaults = {
  title?: string;
  category?: string;
  description?: string;
  startsLocal?: string;
  endsLocal?: string;
  capacity?: number | null;
  priceRupees?: number;
};

export function WorkshopForm({
  action,
  defaults,
  submitLabel,
  showPublish,
}: {
  action: (prev: WorkshopState, fd: FormData) => Promise<WorkshopState>;
  defaults?: WorkshopDefaults;
  submitLabel: string;
  showPublish?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as WorkshopState);
  const d = defaults ?? {};

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={d.title} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" defaultValue={d.category} placeholder="Tabla, Painting…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="starts_at">Starts</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={d.startsLocal} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ends_at">Ends</Label>
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={d.endsLocal} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="capacity">Capacity (blank = unlimited)</Label>
          <Input id="capacity" name="capacity" type="number" min="1" defaultValue={d.capacity ?? undefined} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="price">Price (₹, 0 = free)</Label>
          <Input id="price" name="price" type="number" min="0" step="1" defaultValue={d.priceRupees ?? 0} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={d.description}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {showPublish && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" className="size-4" />
          Publish immediately
        </label>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
