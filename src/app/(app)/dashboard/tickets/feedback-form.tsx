"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitFeedbackAction, type FeedbackState } from "@/lib/events/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedbackForm({
  eventId,
  existingRating,
  existingComment,
}: {
  eventId: string;
  existingRating?: number;
  existingComment?: string;
}) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useActionState(
    submitFeedbackAction.bind(null, eventId),
    {} as FeedbackState,
  );

  return (
    <form action={action} className="w-full border-t border-border/60 pt-3">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                (hover || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={2}
        defaultValue={existingComment ?? ""}
        placeholder="Share a comment (optional)"
        className="mt-2 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      {state.error && <p className="mt-1 text-xs text-destructive">{state.error}</p>}
      {state.message && (
        <p className="mt-1 text-xs text-emerald-600">{state.message}</p>
      )}

      <Button
        type="submit"
        size="xs"
        variant="outline"
        className="mt-2"
        disabled={pending || rating === 0}
      >
        {pending
          ? "Saving…"
          : existingRating
            ? "Update feedback"
            : "Submit feedback"}
      </Button>
    </form>
  );
}
