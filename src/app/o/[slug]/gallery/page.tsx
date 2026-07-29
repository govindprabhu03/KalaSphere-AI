import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicOrgHeader } from "@/components/site/public-org-header";

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: items } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });
  const rows = items ?? [];

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Gallery</h1>
        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rows.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-lg border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image_url} alt={g.title ?? "Gallery image"} className="aspect-square w-full object-cover" />
                {g.title && <p className="p-2 text-xs text-muted-foreground">{g.title}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
