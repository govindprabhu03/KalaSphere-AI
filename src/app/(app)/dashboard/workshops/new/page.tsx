import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createWorkshopAction } from "@/lib/workshops/actions";
import { Card, CardContent } from "@/components/ui/card";
import { WorkshopForm } from "../workshop-form";

export const metadata = { title: "New workshop" };

export default async function NewWorkshopPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">New workshop</h1>
      <Card className="py-6">
        <CardContent>
          <WorkshopForm action={createWorkshopAction} submitLabel="Create workshop" showPublish />
        </CardContent>
      </Card>
    </div>
  );
}
