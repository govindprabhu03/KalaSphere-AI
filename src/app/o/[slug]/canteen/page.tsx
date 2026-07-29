import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { CanteenClient } from "./canteen-client";

export default async function PublicCanteenPage({
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
    .from("menu_items")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_available", true)
    .order("category", { ascending: true });
  const ctx = await getOptionalContext();

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {org.name}
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Canteen</h1>
        {!ctx && (
          <p className="mt-3 text-sm text-muted-foreground">
            Please{" "}
            <Link href="/login" className="text-primary hover:underline">log in</Link> to order.
          </p>
        )}
        <CanteenClient
          org={org.id}
          items={(items ?? []).map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            price_cents: i.price_cents,
          }))}
          canOrder={!!ctx}
        />
      </main>
    </>
  );
}
