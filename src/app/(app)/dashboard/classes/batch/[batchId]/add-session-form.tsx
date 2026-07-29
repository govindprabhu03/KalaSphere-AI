"use client";

import { useActionState } from "react";
import { createSessionAction, type ClassState } from "@/lib/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSessionForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(
    createSessionAction.bind(null, batchId),
    {} as ClassState,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="session_date">Date</Label>
        <Input id="session_date" name="session_date" type="date" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s-title">Title (optional)</Label>
        <Input id="s-title" name="title" placeholder="Session topic" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add session"}
      </Button>
    </form>
  );
}
