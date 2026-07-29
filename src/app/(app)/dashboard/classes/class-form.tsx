"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClassState } from "@/lib/classes/actions";

export function ClassForm({
  action,
  submitLabel,
  showPublish,
}: {
  action: (prev: ClassState, fd: FormData) => Promise<ClassState>;
  submitLabel: string;
  showPublish?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ClassState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Class title</Label>
        <Input id="title" name="title" placeholder="Hindustani Vocal" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="discipline">Discipline</Label>
          <Input id="discipline" name="discipline" placeholder="Vocal, Tabla, Kathak…" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="fee">Monthly fee (₹, 0 = free)</Label>
          <Input id="fee" name="fee" type="number" min="0" step="1" defaultValue={0} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {showPublish && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" className="size-4" />
          Publish immediately (open for enrollment)
        </label>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
