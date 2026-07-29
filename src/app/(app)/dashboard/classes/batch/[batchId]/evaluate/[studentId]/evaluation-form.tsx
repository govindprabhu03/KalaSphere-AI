"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GrowthState } from "@/lib/growth/actions";

const METRICS: [string, string][] = [
  ["pitch", "Pitch"],
  ["rhythm", "Rhythm"],
  ["voice", "Voice"],
  ["confidence", "Confidence"],
  ["coordination", "Coordination"],
  ["expression", "Expression"],
  ["practice", "Practice"],
  ["attendance", "Attendance"],
  ["performance", "Performance"],
];

export function EvaluationForm({
  action,
  defaults,
}: {
  action: (p: GrowthState, fd: FormData) => Promise<GrowthState>;
  defaults?: Record<string, number | string>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as GrowthState);
  const d = defaults ?? {};

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid max-w-40 gap-1.5">
        <Label htmlFor="period">Month</Label>
        <Input id="period" name="period" type="month" defaultValue={String(d.period ?? "")} required />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METRICS.map(([k, label]) => (
          <div key={k} className="grid gap-1">
            <Label htmlFor={k} className="text-xs">
              {label} (0–10)
            </Label>
            <Input id={k} name={k} type="number" min="0" max="10" defaultValue={d[k] ?? 0} />
          </div>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="remarks">Remarks</Label>
        <textarea
          id="remarks"
          name="remarks"
          rows={3}
          defaultValue={String(d.remarks ?? "")}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save evaluation"}
        </Button>
      </div>
    </form>
  );
}
