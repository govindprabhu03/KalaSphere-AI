import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { PublicOrgHeader } from "@/components/site/public-org-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { RegisterButton } from "./register-button";
import { PayButton } from "./pay-button";

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string; eventSlug: string }>;
}) {
  const { slug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: orgs } = await supabase.rpc("public_org_by_slug", {
    p_slug: slug,
  });
  const org = orgs?.[0];
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!event) notFound();

  const ctx = await getOptionalContext();
  let alreadyRegistered = false;
  if (ctx) {
    const { data: reg } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    alreadyRegistered = !!reg;
  }

  const price = formatMoney(event.price_cents, event.currency);

  return (
    <>
      <PublicOrgHeader name={org.name} slug={org.slug} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/o/${org.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {org.name}
        </Link>

        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{formatEventDateTime(event.starts_at)}</span>
          {event.location_text && <span>· {event.location_text}</span>}
          {event.category && <Badge variant="secondary">{event.category}</Badge>}
        </div>

        {event.description && (
          <p className="mt-6 text-sm leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        <div className="mt-8 rounded-xl border border-border/60 p-5">
          <p className="text-lg font-semibold">{price}</p>
          <div className="mt-3">
            {!ctx ? (
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
                Log in to register
              </Link>
            ) : alreadyRegistered ? (
              <Link
                href="/dashboard/tickets"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                You&apos;re registered — view ticket
              </Link>
            ) : event.price_cents > 0 ? (
              isRazorpayConfigured() ? (
                <PayButton eventId={event.id} priceLabel={price} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Online payment for this event isn&apos;t available yet — please
                  check back soon.
                </p>
              )
            ) : (
              <RegisterButton eventId={event.id} priceLabel={price} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
