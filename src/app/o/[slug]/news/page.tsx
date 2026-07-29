import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { PublicOrgHeader } from "@/components/site/public-org-header";

export default async function PublicNewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: posts } = await supabase
    .from("news_posts")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  const rows = posts ?? [];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">News</h1>
        {rows.length === 0 ? (
          <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">No news yet.</Card>
        ) : (
          <div className="mt-6 grid gap-3">
            {rows.map((p) => (
              <Link key={p.id} href={`/o/${org.slug}/news/${p.slug}`} className="block">
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatEventDateTime(p.created_at)}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
