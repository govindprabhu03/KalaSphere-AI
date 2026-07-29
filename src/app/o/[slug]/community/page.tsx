import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PublicCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: artists } = await supabase
    .from("artist_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_public", true)
    .order("stage_name", { ascending: true });
  const rows = artists ?? [];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Community</h1>
        {rows.length === 0 ? (
          <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
            No artist profiles yet.
          </Card>
        ) : (
          <div className="mt-6 grid gap-3">
            {rows.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.stage_name}</span>
                  {a.discipline && <Badge variant="secondary">{a.discipline}</Badge>}
                </div>
                {a.bio && <p className="mt-1 text-sm text-muted-foreground">{a.bio}</p>}
                {a.links && (
                  <a
                    href={a.links}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-primary hover:underline"
                  >
                    {a.links}
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
