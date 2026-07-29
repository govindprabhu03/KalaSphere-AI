"use client";

import { useActionState } from "react";
import type { ContentState } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";

export function AnnouncementForm({
  action,
}: {
  action: (p: ContentState, fd: FormData) => Promise<ContentState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ContentState);
  return (
    <form action={formAction} className="grid gap-3">
      <textarea
        name="message"
        rows={2}
        placeholder="Share an update with everyone…"
        required
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post announcement"}
        </Button>
      </div>
    </form>
  );
}
