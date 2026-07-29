import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicOrgHeader } from "@/components/site/public-org-header";

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", {
    p_slug: slug,
  });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_published", true)
    .order("starts_at", { ascending: true });
  const rows = events ?? [];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {org.name}
        </h1>
        <p className="mt-1 text-muted-foreground">Upcoming events</p>

        <div className="mt-6 grid gap-3">
          {rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No upcoming events right now.
            </Card>
          ) : (
            rows.map((e) => (
              <Link
                key={e.id}
                href={`/o/${org.slug}/events/${e.slug}`}
                className="block"
              >
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{e.title}</span>
                        {e.category && (
                          <Badge variant="secondary">{e.category}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatEventDateTime(e.starts_at)}
                        {e.location_text ? ` · ${e.location_text}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {formatMoney(e.price_cents, e.currency)}
                    </span>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
