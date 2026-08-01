import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function PublicOrgHeader({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const logo = data?.[0]?.logo_url ?? null;

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link href={`/o/${slug}`} className="flex items-center gap-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="size-8 rounded-lg border border-border/60 object-cover"
            />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="font-heading text-sm font-semibold">{name}</span>
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
