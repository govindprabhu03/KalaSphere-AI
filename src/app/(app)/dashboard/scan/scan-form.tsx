"use client";

import { useActionState } from "react";
import { checkInAction, type EventState } from "@/lib/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: EventState = {};

export function ScanForm() {
  const [state, formAction, pending] = useActionState(checkInAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Ticket code</Label>
        <Input
          id="code"
          name="code"
          autoComplete="off"
          placeholder="ABCD123456"
          className="font-mono tracking-widest uppercase"
          required
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          role="status"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Check in"}
      </Button>
    </form>
  );
}
