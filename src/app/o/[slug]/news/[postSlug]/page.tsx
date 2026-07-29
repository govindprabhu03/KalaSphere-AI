import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime } from "@/lib/format";
import { PublicOrgHeader } from "@/components/site/public-org-header";

export default async function PublicNewsPostPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  const supabase = await createClient();
  const { data: orgs } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: post } = await supabase
    .from("news_posts")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", postSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!post) notFound();

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link href={`/o/${org.slug}/news`} className="text-sm text-muted-foreground hover:text-foreground">
          ← News
        </Link>
        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt="" className="mt-4 w-full rounded-xl object-cover" />
        )}
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{formatEventDateTime(post.created_at)}</p>
        {post.body && (
          <div className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">{post.body}</div>
        )}
      </main>
    </>
  );
}
