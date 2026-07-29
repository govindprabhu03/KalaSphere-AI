import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  type ContentState,
} from "@/lib/content/actions";
import { formatEventDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnnouncementForm } from "./announcement-form";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: anns } = await supabase
    .from("announcements")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });
  const rows = anns ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Announcements</h1>
      <Card className="mb-6 py-5">
        <CardContent>
          <AnnouncementForm action={createAnnouncementAction as (p: ContentState, fd: FormData) => Promise<ContentState>} />
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {rows.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm">{a.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatEventDateTime(a.created_at)}</p>
              </div>
              <form action={deleteAnnouncementAction.bind(null, a.id)}>
                <Button size="xs" variant="ghost" type="submit">Delete</Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
