import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");
  const isAdmin = ctx.role === "admin" || ctx.role === "super_admin";

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("classes")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Cultural classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ongoing classes with batches, attendance and assignments.
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/classes/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="size-4" /> New class
          </Link>
        )}
      </div>

      {(rows ?? []).length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No classes yet.</Card>
      ) : (
        <div className="grid gap-3">
          {(rows ?? []).map((c) => (
            <Link key={c.id} href={`/dashboard/classes/${c.id}`} className="block">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.title}</span>
                      <Badge variant={c.is_published ? "default" : "secondary"}>
                        {c.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    {c.discipline && (
                      <p className="mt-1 text-sm text-muted-foreground">{c.discipline}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-medium">
                    {formatMoney(c.fee_cents, c.currency)}
                    {c.fee_cents > 0 ? "/mo" : ""}
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
