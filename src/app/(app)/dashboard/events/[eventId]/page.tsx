import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil, ExternalLink, Star } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import {
  setEventPublishedAction,
  deleteEventAction,
} from "@/lib/events/actions";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IssueCertificates } from "./issue-certificates";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("organization_id", ctx.activeOrgId!)
    .maybeSingle();
  if (!event) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", event.organization_id)
    .maybeSingle();
  const { data: regs } = await supabase.rpc("list_event_registrations", {
    p_event_id: eventId,
  });
  const rows = regs ?? [];
  const attended = rows.filter((r) => r.checked_in_at).length;

  // Feedback for this event (admins can read all of their org's feedback via RLS).
  const { data: feedback } = await supabase
    .from("event_feedback")
    .select("rating, comment, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  const fbRows = feedback ?? [];
  const avgRating =
    fbRows.length > 0
      ? fbRows.reduce((s, f) => s + f.rating, 0) / fbRows.length
      : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/events"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Events
      </Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            <Badge variant={event.is_published ? "default" : "secondary"}>
              {event.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEventDateTime(event.starts_at)}
            {event.location_text ? ` · ${event.location_text}` : ""} ·{" "}
            {formatMoney(event.price_cents, event.currency)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="size-4" /> Edit
          </Link>
          {event.is_published && org && (
            <a
              href={`/o/${org.slug}/events/${event.slug}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink className="size-4" /> Public page
            </a>
          )}
          <form action={setEventPublishedAction.bind(null, event.id, !event.is_published)}>
            <Button type="submit" variant="outline" size="sm">
              {event.is_published ? "Unpublish" : "Publish"}
            </Button>
          </form>
          <form action={deleteEventAction.bind(null, event.id)}>
            <Button type="submit" variant="destructive" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>

      {event.description && (
        <Card className="mb-6">
          <CardContent className="text-sm whitespace-pre-wrap">
            {event.description}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Certificates</p>
            <p className="text-xs text-muted-foreground">
              Issue a certificate to everyone who has checked in ({attended} so
              far). Recipients find it under their Certificates page.
            </p>
          </div>
          <IssueCertificates eventId={event.id} defaultTitle={event.title} />
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Registrations ({rows.length}
        {event.capacity ? ` / ${event.capacity}` : ""}) · {attended} checked in
      </h2>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-4 py-2.5 font-medium">Ticket</th>
                <th className="px-4 py-2.5 font-medium">Checked in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.registration_id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-2.5">
                    {r.payment_status === "not_required" ? "Free" : r.payment_status}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.ticket_code ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.checked_in_at ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {fbRows.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted-foreground">
            Feedback
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {avgRating.toFixed(1)}
            </span>
            <span>
              · {fbRows.length} response{fbRows.length === 1 ? "" : "s"}
            </span>
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-border/40">
              {fbRows.map((f, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="inline-flex shrink-0 items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, n) => (
                      <Star
                        key={n}
                        className={cn(
                          "size-3.5",
                          n < f.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </span>
                  {f.comment ? (
                    <p className="text-sm text-foreground/90">{f.comment}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No comment</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
