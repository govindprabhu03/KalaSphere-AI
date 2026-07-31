"use client";

import { useActionState } from "react";
import {
  gradeAssignmentAction,
  type AssignmentState,
} from "@/lib/assignments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GradeForm({
  submissionId,
  grade,
  feedback,
}: {
  submissionId: string;
  grade?: string;
  feedback?: string;
}) {
  const [state, action, pending] = useActionState(
    gradeAssignmentAction.bind(null, submissionId),
    {} as AssignmentState,
  );

  return (
    <form
      action={action}
      className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[130px_1fr_auto] sm:items-end"
    >
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Grade</label>
        <Input name="grade" defaultValue={grade} placeholder="A / 8·10" className="h-9" />
      </div>
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Feedback</label>
        <Input
          name="feedback"
          defaultValue={feedback}
          placeholder="Lovely tone — work on the taans."
          className="h-9"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state.error && (
        <p className="text-xs text-destructive sm:col-span-3">{state.error}</p>
      )}
      {state.message && (
        <p className="text-xs text-emerald-600 sm:col-span-3">{state.message}</p>
      )}
    </form>
  );
}
