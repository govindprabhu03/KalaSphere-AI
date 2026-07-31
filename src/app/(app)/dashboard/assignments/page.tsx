import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitAssignmentForm } from "./submit-form";

export const metadata = { title: "Assignments" };

export default async function MyAssignmentsPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_my_assignments");
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Assignments
      </h1>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No assignments yet. When you enrol in a class, your teacher&apos;s
          assignments show up here.
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((a) => {
            const graded = a.submission_status === "graded";
            const submitted = a.submission_status === "submitted";
            return (
              <Card key={a.assignment_id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.class_title} · {a.batch_name}
                      {a.due_date
                        ? ` · Due ${new Date(a.due_date).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={graded ? "default" : submitted ? "secondary" : "outline"}
                  >
                    {graded
                      ? `Graded${a.my_grade ? ` · ${a.my_grade}` : ""}`
                      : submitted
                        ? "Submitted"
                        : "Not submitted"}
                  </Badge>
                </div>

                {a.description && (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{a.description}</p>
                )}

                {graded && a.my_feedback && (
                  <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span className="font-medium">Feedback:</span> {a.my_feedback}
                  </p>
                )}

                <SubmitAssignmentForm
                  assignmentId={a.assignment_id}
                  orgId={ctx.activeOrgId ?? ""}
                  defaultContent={a.my_content ?? undefined}
                  resubmit={submitted || graded}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
