import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatEventDateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: false });
  const rows = orders ?? [];

  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, name_snapshot, qty")
    .in("order_id", rows.map((o) => o.id));
  const byOrder = new Map<string, string[]>();
  for (const it of items ?? []) {
    const arr = byOrder.get(it.order_id) ?? [];
    arr.push(`${it.qty}× ${it.name_snapshot}`);
    byOrder.set(it.order_id, arr);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">My orders</h1>
      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No orders yet.</Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">#{o.order_number}</span>
                <Badge
                  variant={
                    o.status === "ready" ? "default" : o.status === "collected" ? "outline" : "secondary"
                  }
                >
                  {o.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm">{(byOrder.get(o.id) ?? []).join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatEventDateTime(o.created_at)} · {formatMoney(o.total_cents, "INR")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
