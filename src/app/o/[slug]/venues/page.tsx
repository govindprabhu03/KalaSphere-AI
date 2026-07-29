import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicOrgHeader } from "@/components/site/public-org-header";

export default async function PublicVenuesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: venues } = await supabase
    .from("venues")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .order("name", { ascending: true });
  const rows = venues ?? [];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Venues</h1>

        {rows.length === 0 ? (
          <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
            No venues available.
          </Card>
        ) : (
          <div className="mt-6 grid gap-3">
            {rows.map((v) => (
              <Link key={v.id} href={`/o/${org.slug}/venues/${v.id}`} className="block">
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{v.name}</p>
                      {v.capacity && (
                        <p className="text-sm text-muted-foreground">Capacity {v.capacity}</p>
                      )}
                      {v.facilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {v.facilities.map((f) => (
                            <Badge key={f} variant="secondary">{f}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {formatMoney(v.base_rate_cents, "INR")}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
