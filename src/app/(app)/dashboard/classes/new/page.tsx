import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClassAction } from "@/lib/classes/actions";
import { Card, CardContent } from "@/components/ui/card";
import { ClassForm } from "../class-form";

export const metadata = { title: "New class" };

export default async function NewClassPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">New class</h1>
      <Card className="py-6">
        <CardContent>
          <ClassForm action={createClassAction} submitLabel="Create class" showPublish />
        </CardContent>
      </Card>
    </div>
  );
}
