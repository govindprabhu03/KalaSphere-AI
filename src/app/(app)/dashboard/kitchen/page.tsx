import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { advanceOrderAction } from "@/lib/canteen/actions";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Kitchen" };

const NEXT: Record<string, string | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "collected",
};
const NEXT_LABEL: Record<string, string> = {
  pending: "Start preparing",
  preparing: "Mark ready",
  ready: "Mark collected",
};

export default async function KitchenPage() {
  const ctx = await requireContext();
  if (!["admin", "faculty", "super_admin"].includes(ctx.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase.rpc("list_kitchen_orders", { p_org: ctx.activeOrgId! });
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-heading text-2xl font-semibold tracking-tight">Kitchen board</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Active orders — advance each as it&apos;s prepared. Refresh for new orders.
      </p>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No active orders.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((o) => {
            const nx = NEXT[o.status];
            return (
              <Card key={o.order_id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">#{o.order_number}</span>
                  <Badge variant={o.status === "ready" ? "default" : "secondary"}>{o.status}</Badge>
                </div>
                <p className="mt-1 text-sm">{o.items}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {o.requester} · {formatMoney(o.total_cents, "INR")}
                </p>
                {nx && (
                  <form action={advanceOrderAction.bind(null, o.order_id, nx)} className="mt-3">
                    <Button size="sm" type="submit">{NEXT_LABEL[o.status]}</Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
