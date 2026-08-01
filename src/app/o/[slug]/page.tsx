import Link from "next/link";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicOrgHeader } from "@/components/site/public-org-header";

function RowLink({
  href,
  title,
  sub,
  right,
  badge,
}: {
  href: string;
  title: string;
  sub?: string;
  right?: string;
  badge?: string | null;
}) {
  return (
    <Link href={href} className="block">
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{title}</span>
              {badge && <Badge variant="secondary">{badge}</Badge>}
            </div>
            {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
          </div>
          {right && <span className="shrink-0 text-sm font-medium">{right}</span>}
        </div>
      </Card>
    </Link>
  );
}

const QUICK_LINKS = [
  ["venues", "Venues"],
  ["canteen", "Canteen"],
  ["news", "News"],
  ["gallery", "Gallery"],
  ["community", "Community"],
] as const;

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const [{ data: events }, { data: workshops }, { data: classes }, { data: anns }] =
    await Promise.all([
      supabase.from("events").select("*").eq("organization_id", org.id).eq("is_published", true).order("starts_at", { ascending: true }),
      supabase.from("workshops").select("*").eq("organization_id", org.id).eq("is_published", true).order("starts_at", { ascending: true }),
      supabase.from("classes").select("*").eq("organization_id", org.id).eq("is_published", true).order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(1),
    ]);

  const ev = events ?? [];
  const ws = workshops ?? [];
  const cl = classes ?? [];
  const latestAnn = (anns ?? [])[0];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{org.name}</h1>
        {org.tagline && (
          <p className="mt-2 text-base text-muted-foreground">{org.tagline}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {QUICK_LINKS.map(([path, label]) => (
            <Link
              key={path}
              href={`/o/${org.slug}/${path}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {label}
            </Link>
          ))}
        </div>

        {latestAnn && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-4">
            <Megaphone className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm">{latestAnn.message}</p>
          </div>
        )}

        <h2 className="mt-8 mb-3 font-heading text-lg font-semibold">Upcoming events</h2>
        {ev.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <div className="grid gap-3">
            {ev.map((e) => (
              <RowLink key={e.id} href={`/o/${org.slug}/events/${e.slug}`} title={e.title}
                sub={`${formatEventDateTime(e.starts_at)}${e.location_text ? ` · ${e.location_text}` : ""}`}
                right={formatMoney(e.price_cents, e.currency)} badge={e.category} />
            ))}
          </div>
        )}

        <h2 className="mt-8 mb-3 font-heading text-lg font-semibold">Workshops</h2>
        {ws.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workshops right now.</p>
        ) : (
          <div className="grid gap-3">
            {ws.map((w) => (
              <RowLink key={w.id} href={`/o/${org.slug}/workshops/${w.slug}`} title={w.title}
                sub={w.starts_at ? formatEventDateTime(w.starts_at) : "Date TBA"}
                right={formatMoney(w.price_cents, w.currency)} badge={w.category} />
            ))}
          </div>
        )}

        <h2 className="mt-8 mb-3 font-heading text-lg font-semibold">Cultural classes</h2>
        {cl.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes open right now.</p>
        ) : (
          <div className="grid gap-3">
            {cl.map((c) => (
              <RowLink key={c.id} href={`/o/${org.slug}/classes/${c.slug}`} title={c.title}
                sub={c.discipline ?? ""}
                right={`${formatMoney(c.fee_cents, c.currency)}${c.fee_cents > 0 ? "/mo" : ""}`} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
