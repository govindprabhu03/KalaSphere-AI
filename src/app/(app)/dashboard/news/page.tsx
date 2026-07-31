import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { setNewsPublishedAction, deleteNewsAction } from "@/lib/content/actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewsForm } from "./news-form";

export const metadata = { title: "News" };

export default async function NewsPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("news_posts")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });
  const rows = posts ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">News</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No posts yet.</Card>
          ) : (
            <div className="grid gap-3">
              {rows.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.title}</span>
                      <Badge variant={p.is_published ? "default" : "secondary"}>
                        {p.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <form action={setNewsPublishedAction.bind(null, p.id, !p.is_published)}>
                        <Button size="xs" variant="outline" type="submit">
                          {p.is_published ? "Unpublish" : "Publish"}
                        </Button>
                      </form>
                      <form action={deleteNewsAction.bind(null, p.id)}>
                        <Button size="xs" variant="ghost" type="submit">Delete</Button>
                      </form>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div>
          <Card className="py-5">
            <CardHeader>
              <CardTitle className="text-sm">New post</CardTitle>
            </CardHeader>
            <CardContent>
              <NewsForm orgId={ctx.activeOrgId!} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
