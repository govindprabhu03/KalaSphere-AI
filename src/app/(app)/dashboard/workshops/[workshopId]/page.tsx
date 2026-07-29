import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, ExternalLink } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  setWorkshopPublishedAction,
  deleteWorkshopAction,
} from "@/lib/workshops/actions";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function WorkshopDetailPage({
  params,
}: {
  params: Promise<{ workshopId: string }>;
}) {
  const { workshopId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", workshopId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!w) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", w.organization_id)
    .maybeSingle();
  const { data: enrolls } = await supabase.rpc("list_workshop_enrollments", {
    p_workshop_id: workshopId,
  });
  const rows = enrolls ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/workshops" className="text-sm text-muted-foreground hover:text-foreground">
        ← Workshops
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{w.title}</h1>
            <Badge variant={w.is_published ? "default" : "secondary"}>
              {w.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {w.starts_at ? formatEventDateTime(w.starts_at) : "Date TBA"} ·{" "}
            {formatMoney(w.price_cents, w.currency)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/workshops/${w.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="size-4" /> Edit
          </Link>
          {w.is_published && org && (
            <a
              href={`/o/${org.slug}/workshops/${w.slug}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink className="size-4" /> Public page
            </a>
          )}
          <form action={setWorkshopPublishedAction.bind(null, w.id, !w.is_published)}>
            <Button type="submit" variant="outline" size="sm">
              {w.is_published ? "Unpublish" : "Publish"}
            </Button>
          </form>
          <form action={deleteWorkshopAction.bind(null, w.id)}>
            <Button type="submit" variant="destructive" size="sm">Delete</Button>
          </form>
        </div>
      </div>

      {w.description && (
        <Card className="mb-6">
          <CardContent className="text-sm whitespace-pre-wrap">{w.description}</CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Enrollments ({rows.length})
      </h2>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.enrollment_id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-2.5">
                    {r.payment_status === "not_required" ? "Free" : r.payment_status}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
