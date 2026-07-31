import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { updateClassAction } from "@/lib/classes/actions";
import { Card, CardContent } from "@/components/ui/card";
import { ClassForm } from "../../class-form";

export const metadata = { title: "Edit class" };

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!cls) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Edit class
      </h1>
      <Card className="py-6">
        <CardContent>
          <ClassForm
            action={updateClassAction.bind(null, classId)}
            submitLabel="Save changes"
            defaults={{
              title: cls.title,
              discipline: cls.discipline ?? undefined,
              fee: cls.fee_cents / 100,
              description: cls.description ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
