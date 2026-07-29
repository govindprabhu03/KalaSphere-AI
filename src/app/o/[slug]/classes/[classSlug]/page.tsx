import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { enrollInClassAction } from "@/lib/classes/actions";
import { formatMoney } from "@/lib/format";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { EnrollButton } from "@/components/site/enroll-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PublicClassPage({
  params,
}: {
  params: Promise<{ slug: string; classSlug: string }>;
}) {
  const { slug, classSlug } = await params;
  const supabase = await createClient();

  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", classSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!cls) notFound();

  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("class_id", cls.id)
    .order("created_at", { ascending: true });
  const bRows = batches ?? [];

  const ctx = await getOptionalContext();
  const enrolled = new Set<string>();
  if (ctx && bRows.length) {
    const { data: en } = await supabase
      .from("class_enrollments")
      .select("batch_id")
      .eq("student_user_id", ctx.user.id)
      .in("batch_id", bRows.map((b) => b.id));
    for (const e of en ?? []) enrolled.add(e.batch_id);
  }

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{cls.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {cls.discipline && <Badge variant="secondary">{cls.discipline}</Badge>}
          <span>
            {formatMoney(cls.fee_cents, cls.currency)}
            {cls.fee_cents > 0 ? " / month" : ""}
          </span>
        </div>
        {cls.description && (
          <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">{cls.description}</p>
        )}

        <h2 className="mt-8 mb-3 text-sm font-medium text-muted-foreground">Batches</h2>
        {bRows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No batches open for enrollment yet.
          </Card>
        ) : (
          <div className="grid gap-3">
            {bRows.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{b.name}</p>
                    {b.schedule_text && (
                      <p className="text-sm text-muted-foreground">{b.schedule_text}</p>
                    )}
                  </div>
                  {!ctx ? (
                    <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
                      Log in to enroll
                    </Link>
                  ) : enrolled.has(b.id) ? (
                    <span className="text-sm font-medium text-emerald-600">Enrolled ✓</span>
                  ) : (
                    <EnrollButton action={enrollInClassAction.bind(null, b.id)} label="Enroll" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
