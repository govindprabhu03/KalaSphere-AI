import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type OrgRole } from "@/lib/auth/roles";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddMemberForm } from "./add-member-form";
import { MemberControls } from "./member-controls";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");
  if (!ctx.activeOrgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: members } = await supabase.rpc("list_org_members", {
    org: ctx.activeOrgId,
  });
  const rows = members ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Members
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add people to your organization and manage their roles.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add a member</CardTitle>
          <CardDescription>
            The person must have registered first. Enter their email and pick a
            role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddMemberForm />
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 text-right font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const isSelf = m.user_id === ctx.user.id;
                return (
                  <tr key={m.member_id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5">
                      {m.full_name ?? "—"}
                      {isSelf && (
                        <Badge variant="secondary" className="ml-2">
                          You
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-2.5">
                      {isSelf ? (
                        <div className="text-right text-muted-foreground">
                          {ROLE_LABELS[m.role as OrgRole] ?? m.role}
                        </div>
                      ) : (
                        <MemberControls memberId={m.member_id} role={m.role} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
