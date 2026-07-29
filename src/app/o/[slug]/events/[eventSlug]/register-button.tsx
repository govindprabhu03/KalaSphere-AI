"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { registerForEventAction } from "@/lib/events/actions";

export function RegisterButton({
  eventId,
  priceLabel,
}: {
  eventId: string;
  priceLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await registerForEventAction(eventId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Registering…" : `Register · ${priceLabel}`}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
