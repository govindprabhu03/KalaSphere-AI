import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GradeForm } from "./grade-form";

export const metadata = { title: "Submissions" };

export default async function AssignmentSubmissionsPage({
  params,
}: {
  params: Promise<{ batchId: string; assignmentId: string }>;
}) {
  const { batchId, assignmentId } = await params;
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: asg } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!asg) notFound();

  const { data: subs } = await supabase.rpc("list_assignment_submissions", {
    p_assignment_id: assignmentId,
  });
  const rows = subs ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/classes/batch/${batchId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Batch
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
        {asg.title}
      </h1>
      {asg.description && (
        <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
          {asg.description}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {asg.due_date
          ? `Due ${new Date(asg.due_date).toLocaleDateString()}`
          : "No due date"}{" "}
        · {rows.length} submission{rows.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid gap-4">
        {rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No submissions yet.
          </Card>
        ) : (
          rows.map((s) => (
            <Card key={s.submission_id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{s.full_name ?? s.email}</p>
                <Badge variant={s.status === "graded" ? "default" : "secondary"}>
                  {s.status === "graded"
                    ? `Graded${s.grade ? ` · ${s.grade}` : ""}`
                    : "Submitted"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(s.submitted_at).toLocaleString()}
              </p>
              {s.content && (
                <p className="mt-3 text-sm whitespace-pre-wrap">{s.content}</p>
              )}
              {s.attachment_url && (
                <a
                  href={s.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.attachment_url}
                    alt="Submission attachment"
                    className="max-h-48 rounded-lg border border-border/60"
                  />
                </a>
              )}
              <GradeForm
                submissionId={s.submission_id}
                grade={s.grade ?? undefined}
                feedback={s.feedback ?? undefined}
              />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
