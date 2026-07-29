import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { updateWorkshopAction } from "@/lib/workshops/actions";
import { Card, CardContent } from "@/components/ui/card";
import { WorkshopForm } from "../../workshop-form";

export const metadata = { title: "Edit workshop" };

export default async function EditWorkshopPage({
  params,
}: {
  params: Promise<{ workshopId: string }>;
}) {
  const { workshopId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", workshopId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Edit workshop</h1>
      <Card className="py-6">
        <CardContent>
          <WorkshopForm
            action={updateWorkshopAction.bind(null, workshopId)}
            submitLabel="Save changes"
            defaults={{
              title: w.title,
              category: w.category ?? undefined,
              description: w.description ?? undefined,
              startsLocal: w.starts_at?.slice(0, 16),
              endsLocal: w.ends_at?.slice(0, 16),
              capacity: w.capacity,
              priceRupees: w.price_cents / 100,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
