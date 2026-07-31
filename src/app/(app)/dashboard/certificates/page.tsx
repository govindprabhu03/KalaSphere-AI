import Link from "next/link";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  await requireContext();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_my_certificates");
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">
        Certificates
      </h1>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          You don&apos;t have any certificates yet. They appear here after you
          attend an event and the organizer issues them.
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((c) => (
            <Card
              key={c.serial}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.org_name}
                  {c.event_title ? ` · ${c.event_title}` : ""} ·{" "}
                  {new Date(c.issued_at).toLocaleDateString()} ·{" "}
                  <span className="font-mono">{c.serial}</span>
                </p>
              </div>
              <Link
                href={`/certificate/${c.serial}`}
                target="_blank"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                View / print
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
