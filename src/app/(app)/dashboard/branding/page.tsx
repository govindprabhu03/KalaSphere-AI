import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrandingForm } from "./branding-form";

export const metadata = { title: "Branding" };

export default async function BrandingPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("slug, logo_url, primary_color, tagline")
    .eq("id", ctx.activeOrgId!)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Branding
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your logo, colour and tagline appear across your public microsite.
          </p>
        </div>
        {org && (
          <a
            href={`/o/${org.slug}`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink className="size-4" /> View public site
          </a>
        )}
      </div>

      <Card className="py-6">
        <CardContent>
          <BrandingForm
            orgId={ctx.activeOrgId!}
            logoUrl={org?.logo_url ?? undefined}
            primaryColor={org?.primary_color ?? "#6d28d9"}
            tagline={org?.tagline ?? undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
