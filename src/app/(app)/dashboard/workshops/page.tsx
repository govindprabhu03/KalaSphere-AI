import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { formatEventDateTime, formatMoney } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Workshops" };

export default async function WorkshopsPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("workshops")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Workshops</h1>
          <p className="mt-1 text-sm text-muted-foreground">Short, focused learning sessions.</p>
        </div>
        <Link href="/dashboard/workshops/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="size-4" /> New workshop
        </Link>
      </div>

      {(rows ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No workshops yet.</Card>
      ) : (
        <div className="grid gap-3">
          {(rows ?? []).map((w) => (
            <Link key={w.id} href={`/dashboard/workshops/${w.id}`} className="block">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{w.title}</span>
                      <Badge variant={w.is_published ? "default" : "secondary"}>
                        {w.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {w.starts_at ? formatEventDateTime(w.starts_at) : "Date TBA"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {formatMoney(w.price_cents, w.currency)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
