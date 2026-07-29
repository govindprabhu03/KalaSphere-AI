import Link from "next/link";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Growth" };

export default async function GrowthIndexPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: myEvals } = await supabase.rpc("list_student_growth", {
    p_student: ctx.user.id,
  });
  const { data: children } = await supabase.rpc("list_my_children");
  const hasOwn = (myEvals ?? []).length > 0;
  const kids = children ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Growth</h1>

      {hasOwn && (
        <Card className="mb-4">
          <CardContent>
            <Link
              href={`/dashboard/growth/${ctx.user.id}`}
              className="font-medium text-primary hover:underline"
            >
              My growth →
            </Link>
          </CardContent>
        </Card>
      )}

      {kids.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your children</h2>
          <div className="grid gap-3">
            {kids.map((k) => (
              <Card key={k.child_user_id} className="p-4">
                <Link
                  href={`/dashboard/growth/${k.child_user_id}`}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium">{k.full_name ?? k.email}</span>
                  <span className="text-sm text-primary">View growth →</span>
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}

      {!hasOwn && kids.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No growth records yet. Faculty enter evaluations from a class batch; parents linked to a
          student will see their child&apos;s progress here.
        </Card>
      )}
    </div>
  );
}
