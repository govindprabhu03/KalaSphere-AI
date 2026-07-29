"use client";

import { useActionState } from "react";
import { addMemberAction, type ActionState } from "@/lib/org/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORG_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const initial: ActionState = {};

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMemberAction, initial);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            name="email"
            type="email"
            placeholder="person@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-role">Role</Label>
          <select
            id="member-role"
            name="role"
            defaultValue="student"
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </form>

      {(state.error || state.message) && (
        <p
          className={cn(
            "text-sm",
            state.error ? "text-destructive" : "text-emerald-600",
          )}
          role="status"
        >
          {state.error ?? state.message}
        </p>
      )}
    </div>
  );
}
