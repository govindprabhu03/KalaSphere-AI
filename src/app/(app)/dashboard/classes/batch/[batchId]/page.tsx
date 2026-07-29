import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AddSessionForm } from "./add-session-form";
import { AttendanceGrid } from "./attendance-grid";

export const metadata = { title: "Batch" };

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");

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
  const { data: students } = await supabase.rpc("list_batch_students", {
    p_batch_id: batchId,
  });
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
            Attendance · {(students ?? []).length} students · {sessRows.length} sessions
          </h2>
          <Card className="p-4">
            <AttendanceGrid
              batchId={batchId}
              students={students ?? []}
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
    </div>
  );
}
