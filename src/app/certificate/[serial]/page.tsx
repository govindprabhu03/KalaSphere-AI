import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("certificate_by_serial", {
    p_serial: serial,
  });
  const cert = data?.[0];
  if (!cert) notFound();

  const date = new Date(cert.issued_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subtitle =
    cert.event_title && cert.event_title !== cert.title
      ? `${cert.title} — ${cert.event_title}`
      : cert.title;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            KalaSphere AI
          </Link>
          <PrintButton />
        </div>

        {/* The certificate — deliberately light in both themes so print looks right. */}
        <div className="relative overflow-hidden rounded-2xl border-4 border-primary/30 bg-white p-8 text-center text-neutral-900 shadow-sm sm:p-12 print:rounded-none print:shadow-none">
          <div className="pointer-events-none absolute inset-3 rounded-xl border border-primary/20" />

          <p className="text-xs font-medium tracking-[0.3em] text-primary/70 uppercase">
            {cert.org_name}
          </p>
          <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Certificate
          </h1>
          <p className="mt-1 text-sm text-neutral-500">of participation</p>

          <p className="mt-8 text-sm text-neutral-500">
            This is proudly presented to
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
            {cert.recipient_name}
          </p>

          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-neutral-600">
            for {subtitle}.
          </p>

          <div className="mt-12 flex items-end justify-between gap-4 text-left text-xs text-neutral-500">
            <div>
              <p className="border-t border-neutral-300 pt-1">{date}</p>
              <p>Date issued</p>
            </div>
            <div className="text-right">
              <p className="border-t border-neutral-300 pt-1 font-mono">
                {cert.serial}
              </p>
              <p>Certificate serial</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground print:hidden">
          This certificate is verifiable — anyone with this link can confirm its
          authenticity.
        </p>
      </div>
    </div>
  );
}
