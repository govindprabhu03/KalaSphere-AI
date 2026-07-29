import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddSessionForm } from "./add-session-form";
import { AttendanceGrid } from "./attendance-grid";
import { LinkParentForm } from "./link-parent-form";

export const metadata = { title: "Batch" };

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!batch) notFound();

  const { data: cls } = await supabase
    .from("classes")
    .select("id, title")
    .eq("id", batch.class_id)
    .maybeSingle();
  const { data: students } = await supabase.rpc("list_batch_students", { p_batch_id: batchId });
  const stu = students ?? [];
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("batch_id", batchId)
    .order("session_date", { ascending: true });
  const sessRows = sessions ?? [];
  const { data: attendance } = await supabase
    .from("class_attendance")
    .select("session_id, student_user_id, present")
    .eq("batch_id", batchId);

  const present: Record<string, boolean> = {};
  for (const a of attendance ?? []) {
    present[`${a.session_id}:${a.student_user_id}`] = a.present;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/dashboard/classes/${batch.class_id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {cls?.title ?? "Class"}
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">{batch.name}</h1>
      {batch.schedule_text && (
        <p className="mt-1 text-sm text-muted-foreground">{batch.schedule_text}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Attendance · {stu.length} students · {sessRows.length} sessions
          </h2>
          <Card className="p-4">
            <AttendanceGrid
              batchId={batchId}
              students={stu}
              sessions={sessRows.map((s) => ({
                id: s.id,
                title: s.title,
                session_date: s.session_date,
              }))}
              present={present}
            />
          </Card>
        </div>

        <div>
          <Card className="py-5">
            <CardHeader>
              <CardTitle className="text-sm">Add a session</CardTitle>
            </CardHeader>
            <CardContent>
              <AddSessionForm batchId={batchId} />
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Students</h2>
      <Card className="p-4">
        {stu.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {stu.map((s) => (
              <div
                key={s.enrollment_id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.full_name ?? s.email}</p>
                  {s.full_name && (
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/classes/batch/${batchId}/evaluate/${s.student_user_id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
                  >
                    Evaluate
                  </Link>
                  <Link
                    href={`/dashboard/growth/${s.student_user_id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
                  >
                    Growth
                  </Link>
                  {isAdmin && <LinkParentForm studentId={s.student_user_id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
