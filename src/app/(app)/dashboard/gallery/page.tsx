import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { deleteGalleryAction } from "@/lib/content/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GalleryForm } from "./gallery-form";

export const metadata = { title: "Gallery" };

export default async function GalleryAdminPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });
  const rows = items ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold tracking-tight">Gallery</h1>
      <Card className="mb-6 py-5">
        <CardContent>
          <GalleryForm orgId={ctx.activeOrgId!} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No images yet.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((g) => (
            <div key={g.id} className="group relative overflow-hidden rounded-lg border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.image_url} alt={g.title ?? "Gallery image"} className="aspect-square w-full object-cover" />
              <form action={deleteGalleryAction.bind(null, g.id)} className="absolute top-1 right-1">
                <Button size="xs" variant="destructive" type="submit">×</Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
