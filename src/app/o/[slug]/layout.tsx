import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-tenant branding scope. Fetches the org's brand colour by slug and scopes
 * it to `--primary` (+ ring) for the whole public microsite, so every page's
 * primary accents (links, buttons, badges) render in the org's colour — with no
 * per-page changes. Falls back to the global theme colour when unset.
 */
export default async function PublicOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_org_by_slug", { p_slug: slug });
  const color = data?.[0]?.primary_color;

  const style = color
    ? ({
        "--primary": color,
        "--ring": color,
        "--sidebar-primary": color,
      } as CSSProperties)
    : undefined;

  return <div style={style}>{children}</div>;
}
