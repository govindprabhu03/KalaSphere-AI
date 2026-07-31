"use client";

import { useActionState } from "react";
import {
  createAssignmentAction,
  type AssignmentState,
} from "@/lib/assignments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAssignmentForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(
    createAssignmentAction.bind(null, batchId),
    {} as AssignmentState,
  );

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="a-title">Title</Label>
        <Input id="a-title" name="title" placeholder="Practice Raag Yaman" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="a-desc">Instructions</Label>
        <textarea
          id="a-desc"
          name="description"
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="a-due">Due date</Label>
        <Input id="a-due" name="due_date" type="date" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add assignment"}
      </Button>
    </form>
  );
}
