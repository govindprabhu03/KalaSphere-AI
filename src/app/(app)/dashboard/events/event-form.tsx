"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EventState } from "@/lib/events/actions";
import { generateEventDescriptionAction } from "@/lib/ai/actions";

export type EventDefaults = {
  title?: string;
  category?: string;
  location_text?: string;
  description?: string;
  startsLocal?: string;
  endsLocal?: string;
  capacity?: number | null;
  priceRupees?: number;
};

export function EventForm({
  action,
  defaults,
  submitLabel,
  showPublish,
}: {
  action: (prev: EventState, fd: FormData) => Promise<EventState>;
  defaults?: EventDefaults;
  submitLabel: string;
  showPublish?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as EventState);
  const d = defaults ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  function generate() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "");
    const category = String(fd.get("category") ?? "");
    startAi(async () => {
      setAiError(null);
      const r = await generateEventDescriptionAction(title, category);
      if (r.error) setAiError(r.error);
      else if (r.answer && descRef.current) descRef.current.value = r.answer;
    });
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={d.title} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={d.category} placeholder="Music, Dance…" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="location_text">Location</Label>
          <Input id="location_text" name="location_text" defaultValue={d.location_text} placeholder="Main Hall" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="starts_at">Starts</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" defaultValue={d.startsLocal} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ends_at">Ends (optional)</Label>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          <Button type="button" variant="ghost" size="xs" onClick={generate} disabled={aiPending}>
            <Sparkles className="size-3.5" /> {aiPending ? "Generating…" : "Generate with AI"}
          </Button>
        </div>
        <textarea
          id="description"
          name="description"
          ref={descRef}
          rows={5}
          defaultValue={d.description}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {aiError && <p className="text-xs text-destructive">{aiError}</p>}
      </div>

      {showPublish && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" className="size-4" />
          Publish immediately (make it visible to the public)
        </label>
      )}

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-sm text-emerald-600" role="status">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending} className={cn(pending && "opacity-70")}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
