"use client";

import { useActionState } from "react";
import {
  createPracticeItemAction,
  type PracticeState,
} from "@/lib/practice/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS: [string, string][] = [
  ["", "Any day"],
  ["0", "Sunday"],
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddPracticeForm({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState(
    createPracticeItemAction.bind(null, batchId),
    {} as PracticeState,
  );

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="p-title">Practice</Label>
        <Input id="p-title" name="title" placeholder="Riyaz — Raag Yaman" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="p-day">Day</Label>
          <select id="p-day" name="day_of_week" className={selectClass}>
            {DAYS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-dur">Minutes</Label>
          <Input id="p-dur" name="duration_min" type="number" min="1" placeholder="30" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="p-notes">Notes</Label>
        <textarea
          id="p-notes"
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}
