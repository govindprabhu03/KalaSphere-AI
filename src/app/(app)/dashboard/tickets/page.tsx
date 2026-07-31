import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { qrDataUrl } from "@/lib/qr";
import { formatEventDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeedbackForm } from "./feedback-form";

export const metadata = { title: "My tickets" };

export default async function TicketsPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: regs } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });
  const rows = regs ?? [];

  const eventIds = [...new Set(rows.map((r) => r.event_id))];
  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, location_text")
    .in("id", eventIds);
  const evById = new Map((events ?? []).map((e) => [e.id, e]));

  // The user's own feedback for these events (to pre-fill / show "update").
  const { data: myFeedback } = await supabase
    .from("event_feedback")
    .select("event_id, rating, comment")
    .eq("user_id", ctx.user.id)
    .in("event_id", eventIds);
  const fbByEvent = new Map((myFeedback ?? []).map((f) => [f.event_id, f]));

  const cards = await Promise.all(
    rows.map(async (r) => ({
      reg: r,
      ev: evById.get(r.event_id),
      qr: r.ticket_code ? await qrDataUrl(r.ticket_code) : null,
    })),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        My tickets
      </h1>

      {cards.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t registered for any events yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(({ reg, ev, qr }) => {
            const started = ev?.starts_at
              ? new Date(ev.starts_at) < new Date()
              : false;
            const fb = fbByEvent.get(reg.event_id);
            return (
              <Card key={reg.id}>
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="w-full">
                    <p className="font-medium">{ev?.title ?? "Event"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatEventDateTime(ev?.starts_at ?? null)}
                      {ev?.location_text ? ` · ${ev.location_text}` : ""}
                    </p>
                  </div>
                  {qr ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qr}
                        alt="Ticket QR code"
                        width={180}
                        height={180}
                        className="rounded-lg border border-border/60"
                      />
                      <p className="font-mono text-sm tracking-widest">
                        {reg.ticket_code}
                      </p>
                    </>
                  ) : (
                    <Badge variant="secondary">Payment pending</Badge>
                  )}
                  {started && (
                    <FeedbackForm
                      eventId={reg.event_id}
                      existingRating={fb?.rating}
                      existingComment={fb?.comment ?? undefined}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
