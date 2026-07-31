import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalContext } from "@/lib/auth/context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getOptionalContext();
  if (ctx) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <Card className="py-6">
      <CardHeader>
        <CardTitle className="text-lg">Welcome back</CardTitle>
        <CardDescription>Log in to your KalaSphere AI account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm oauthError={error} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
