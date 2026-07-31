"use client";

import { useActionState } from "react";
import {
  issueEventCertificatesAction,
  type CertState,
} from "@/lib/certificates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function IssueCertificates({
  eventId,
  defaultTitle,
}: {
  eventId: string;
  defaultTitle: string;
}) {
  const [state, action, pending] = useActionState(
    issueEventCertificatesAction.bind(null, eventId),
    {} as CertState,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Input
        name="title"
        placeholder={defaultTitle}
        aria-label="Certificate title"
        className="h-9 w-56"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Issuing…" : "Issue certificates"}
      </Button>
      {state.error && <span className="text-sm text-destructive">{state.error}</span>}
      {state.message && (
        <span className="text-sm text-emerald-600">{state.message}</span>
      )}
    </form>
  );
}
