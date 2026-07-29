"use client";

import { useActionState } from "react";
import { linkParentAction, type GrowthState } from "@/lib/growth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkParentForm({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(
    linkParentAction.bind(null, studentId),
    {} as GrowthState,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input name="email" type="email" placeholder="parent@email.com" className="h-7 w-44 text-xs" required />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {pending ? "…" : "Link parent"}
      </Button>
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state.message && <span className="text-xs text-emerald-600">{state.message}</span>}
    </form>
  );
}
