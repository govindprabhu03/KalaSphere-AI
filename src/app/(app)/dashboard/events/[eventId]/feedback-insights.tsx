"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { analyzeEventFeedbackAction } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";

export function FeedbackInsights({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await analyzeEventFeedbackAction(eventId);
            if (res.error) {
              setError(res.error);
              setAnswer(null);
            } else {
              setAnswer(res.answer ?? "");
            }
          })
        }
      >
        <Sparkles className="size-4" />
        {pending ? "Analysing…" : answer ? "Regenerate summary" : "Summarise with AI"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {answer && (
        <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-4 text-sm whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  );
}
