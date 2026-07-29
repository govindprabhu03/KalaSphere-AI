"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Result = { error?: string; message?: string };

export function EnrollButton({
  action,
  label,
}: {
  action: () => Promise<Result | void>;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [res, setRes] = useState<Result>({});

  if (res.message) {
    return <p className="text-sm font-medium text-emerald-600">{res.message}</p>;
  }

  return (
    <div>
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setRes({});
            const r = await action();
            setRes(r ?? {});
          })
        }
      >
        {pending ? "Enrolling…" : label}
      </Button>
      {res.error && <p className="mt-2 text-sm text-destructive">{res.error}</p>}
    </div>
  );
}
