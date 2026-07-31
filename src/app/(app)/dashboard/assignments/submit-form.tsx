"use client";

import { useActionState } from "react";
import {
  submitAssignmentAction,
  type AssignmentState,
} from "@/lib/assignments/actions";
import { ImageUpload } from "@/components/app/image-upload";
import { Button } from "@/components/ui/button";

export function SubmitAssignmentForm({
  assignmentId,
  orgId,
  defaultContent,
  resubmit,
}: {
  assignmentId: string;
  orgId: string;
  defaultContent?: string;
  resubmit?: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitAssignmentAction.bind(null, assignmentId),
    {} as AssignmentState,
  );

  return (
    <form action={action} className="mt-3 grid gap-2 border-t border-border/60 pt-3">
      <textarea
        name="content"
        rows={2}
        defaultValue={defaultContent}
        placeholder="Add a note about your work (or attach a photo below)"
        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <ImageUpload name="attachment_url" orgId={orgId} />
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.message && <p className="text-xs text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? "Submitting…" : resubmit ? "Resubmit" : "Submit"}
        </Button>
      </div>
    </form>
  );
}
