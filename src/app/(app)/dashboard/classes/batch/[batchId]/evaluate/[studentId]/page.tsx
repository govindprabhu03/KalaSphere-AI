import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { upsertEvaluationAction } from "@/lib/growth/actions";
import { Card, CardContent } from "@/components/ui/card";
import { EvaluationForm } from "./evaluation-form";

export const metadata = { title: "Evaluate" };

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ batchId: string; studentId: string }>;
}) {
  const { batchId, studentId } = await params;
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: name } = await supabase.rpc("student_display_name", { p_student: studentId });
  const { data: evals } = await supabase.rpc("list_student_growth", { p_student: studentId });
  const latest = (evals ?? []).at(-1);

  const now = new Date();
  const curPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const defaults: Record<string, number | string> = {
    period: latest?.period ?? curPeriod,
    pitch: latest?.pitch ?? 0,
    rhythm: latest?.rhythm ?? 0,
    voice: latest?.voice ?? 0,
    confidence: latest?.confidence ?? 0,
    coordination: latest?.coordination ?? 0,
    expression: latest?.expression ?? 0,
    practice: latest?.practice ?? 0,
    attendance: latest?.attendance_score ?? 0,
    performance: latest?.performance ?? 0,
    remarks: latest?.remarks ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/dashboard/classes/batch/${batchId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Batch
      </Link>
      <h1 className="mt-2 mb-1 font-heading text-2xl font-semibold tracking-tight">
        Evaluate {name ?? "student"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Score each skill 0–10 for the month. Saving again updates that month.
      </p>
      <Card className="py-6">
        <CardContent>
          <EvaluationForm
            action={upsertEvaluationAction.bind(null, batchId, studentId)}
            defaults={defaults}
          />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/growth/${studentId}`} className="text-primary hover:underline">
          View growth charts →
        </Link>
      </p>
    </div>
  );
}
