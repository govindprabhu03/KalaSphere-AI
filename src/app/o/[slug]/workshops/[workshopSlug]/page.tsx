import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { enrollInWorkshopAction } from "@/lib/workshops/actions";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { EnrollButton } from "@/components/site/enroll-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PublicWorkshopPage({
  params,
}: {
  params: Promise<{ slug: string; workshopSlug: string }>;
}) {
  const { slug, workshopSlug } = await params;
  const supabase = await createClient();

  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: w } = await supabase
    .from("workshops")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", workshopSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!w) notFound();

  const ctx = await getOptionalContext();
  let already = false;
  if (ctx) {
    const { data: en } = await supabase
      .from("workshop_enrollments")
      .select("id")
      .eq("workshop_id", w.id)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    already = !!en;
  }

  const price = formatMoney(w.price_cents, w.currency);

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{w.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{w.starts_at ? formatEventDateTime(w.starts_at) : "Date TBA"}</span>
          {w.category && <Badge variant="secondary">{w.category}</Badge>}
        </div>
        {w.description && (
          <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">{w.description}</p>
        )}
        <div className="mt-8 rounded-xl border border-border/60 p-5">
          <p className="text-lg font-semibold">{price}</p>
          <div className="mt-3">
            {!ctx ? (
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
                Log in to enroll
              </Link>
            ) : already ? (
              <p className="text-sm font-medium text-emerald-600">You&apos;re enrolled ✓</p>
            ) : (
              <EnrollButton
                action={enrollInWorkshopAction.bind(null, w.id)}
                label={`Enroll · ${price}`}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
