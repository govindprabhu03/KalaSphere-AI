"use client";

import {
  updateMemberRoleAction,
  removeMemberAction,
} from "@/lib/org/actions";
import { ORG_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export function MemberControls({
  memberId,
  role,
}: {
  memberId: string;
  role: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <form action={updateMemberRoleAction.bind(null, memberId)}>
        <select
          name="role"
          defaultValue={role}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {ORG_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </form>
      <form action={removeMemberAction.bind(null, memberId)}>
        <Button type="submit" variant="ghost" size="sm">
          Remove
        </Button>
      </form>
    </div>
  );
}
