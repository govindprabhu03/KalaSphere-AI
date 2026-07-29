import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ScanForm } from "./scan-form";

export const metadata = { title: "Check-in" };

export default async function ScanPage() {
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Ticket check-in
      </h1>
      <Card className="py-6">
        <CardHeader>
          <CardTitle>Enter ticket code</CardTitle>
          <CardDescription>
            Type or paste the attendee&apos;s ticket code to mark attendance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanForm />
        </CardContent>
      </Card>
    </div>
  );
}
