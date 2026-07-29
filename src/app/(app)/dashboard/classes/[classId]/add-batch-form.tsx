"use client";

import { useActionState } from "react";
import { createBatchAction, type ClassState } from "@/lib/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddBatchForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(
    createBatchAction.bind(null, classId),
    {} as ClassState,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Batch name</Label>
        <Input id="name" name="name" placeholder="Beginners A" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="schedule_text">Schedule</Label>
        <Input id="schedule_text" name="schedule_text" placeholder="Mon & Wed, 6–7pm" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="capacity">Capacity (optional)</Label>
        <Input id="capacity" name="capacity" type="number" min="1" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add batch"}
      </Button>
    </form>
  );
}
