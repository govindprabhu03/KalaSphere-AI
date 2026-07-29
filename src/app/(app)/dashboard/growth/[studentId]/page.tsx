import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { GrowthCharts } from "../growth-charts";

export const metadata = { title: "Growth" };

export default async function StudentGrowthPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  await requireContext();

  const supabase = await createClient();
  const { data: name } = await supabase.rpc("student_display_name", { p_student: studentId });
  const { data: evals } = await supabase.rpc("list_student_growth", { p_student: studentId });
  const rows = evals ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-heading text-2xl font-semibold tracking-tight">
        {name ?? "Student"} · Growth
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">Monthly progress across skills.</p>

      <Card className="mb-6 p-5">
        <GrowthCharts evals={rows} />
      </Card>

      {rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 font-medium">Average</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const fields = [
                    e.pitch, e.rhythm, e.voice, e.confidence, e.coordination,
                    e.expression, e.practice, e.attendance_score, e.performance,
                  ].filter((v): v is number => v != null);
                  const a = fields.length
                    ? Math.round((fields.reduce((x, y) => x + y, 0) / fields.length) * 10) / 10
                    : 0;
                  return (
                    <tr key={e.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2">{e.period}</td>
                      <td className="px-3 py-2">{a}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.remarks ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
