import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Users } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  setClassPublishedAction,
  deleteClassAction,
} from "@/lib/classes/actions";
import { formatMoney } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AddBatchForm } from "./add-batch-form";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!cls) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", cls.organization_id)
    .maybeSingle();
  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  const bRows = batches ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/classes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Classes
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{cls.title}</h1>
            <Badge variant={cls.is_published ? "default" : "secondary"}>
              {cls.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {cls.discipline ? `${cls.discipline} · ` : ""}
            {formatMoney(cls.fee_cents, cls.currency)}
            {cls.fee_cents > 0 ? "/month" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cls.is_published && org && (
            <a
              href={`/o/${org.slug}/classes/${cls.slug}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink className="size-4" /> Public page
            </a>
          )}
          <form action={setClassPublishedAction.bind(null, cls.id, !cls.is_published)}>
            <Button type="submit" variant="outline" size="sm">
              {cls.is_published ? "Unpublish" : "Publish"}
            </Button>
          </form>
          <form action={deleteClassAction.bind(null, cls.id)}>
            <Button type="submit" variant="destructive" size="sm">Delete</Button>
          </form>
        </div>
      </div>

      {cls.description && (
        <Card className="mb-6">
          <CardContent className="text-sm whitespace-pre-wrap">{cls.description}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Batches</h2>
          {bRows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No batches yet — add one to start enrolling students.
            </Card>
          ) : (
            <div className="grid gap-3">
              {bRows.map((b) => (
                <Link key={b.id} href={`/dashboard/classes/batch/${b.id}`} className="block">
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        {b.schedule_text && (
                          <p className="text-sm text-muted-foreground">{b.schedule_text}</p>
                        )}
                      </div>
                      <Users className="size-4 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="py-5">
            <CardHeader>
              <CardTitle className="text-sm">Add a batch</CardTitle>
            </CardHeader>
            <CardContent>
              <AddBatchForm classId={classId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
