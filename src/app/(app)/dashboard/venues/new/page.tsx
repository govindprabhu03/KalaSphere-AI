import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { Card, CardContent } from "@/components/ui/card";
import { VenueForm } from "../venue-form";

export const metadata = { title: "New venue" };

export default async function NewVenuePage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">New venue</h1>
      <Card className="py-6">
        <CardContent>
          <VenueForm />
        </CardContent>
      </Card>
    </div>
  );
}
