import { redirect } from "next/navigation";
import { getOptionalContext } from "@/lib/auth/context";
import { signOutAction } from "@/lib/auth/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateOrgForm } from "./create-org-form";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (ctx.activeOrgId) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="py-6">
          <CardHeader>
            <CardTitle className="text-lg">Set up your organization</CardTitle>
            <CardDescription>
              Create your organization to get started — you&apos;ll be its admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateOrgForm />
            <p className="mt-4 text-sm text-muted-foreground">
              Joining an existing organization instead? Ask its admin to add you
              with your email, then log in again.
            </p>
          </CardContent>
        </Card>

        <form action={signOutAction} className="mt-4 text-center">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
