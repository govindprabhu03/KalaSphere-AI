"use client";

import { useState, useTransition } from "react";
import { placeOrderAction } from "@/lib/canteen/actions";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Item = { id: string; name: string; category: string | null; price_cents: number };

export function CanteenClient({
  org,
  items,
  canOrder,
}: {
  org: string;
  items: Item[];
  canOrder: boolean;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; message?: string }>({});

  const total = items.reduce((s, i) => s + (cart[i.id] ?? 0) * i.price_cents, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  function setQty(id: string, delta: number) {
    setCart((c) => {
      const q = Math.max(0, (c[id] ?? 0) + delta);
      const next = { ...c };
      if (q === 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  function order() {
    startTransition(async () => {
      setResult({});
      const list = Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
      const r = await placeOrderAction(org, list);
      setResult(r ?? {});
      if (r?.message) setCart({});
    });
  }

  if (items.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Nothing on the menu right now.</p>;
  }

  return (
    <div className="mt-6">
      <div className="grid gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
          >
            <div>
              <p className="font-medium">{i.name}</p>
              {i.category && <p className="text-xs text-muted-foreground">{i.category}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatMoney(i.price_cents, "INR")}</span>
              {canOrder && (
                <div className="flex items-center gap-1">
                  <Button size="icon-xs" variant="outline" onClick={() => setQty(i.id, -1)} disabled={!cart[i.id]}>
                    −
                  </Button>
                  <span className="w-5 text-center text-sm">{cart[i.id] ?? 0}</span>
                  <Button size="icon-xs" variant="outline" onClick={() => setQty(i.id, 1)}>
                    +
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {canOrder && count > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-sm font-medium">
            {count} item{count > 1 ? "s" : ""} · {formatMoney(total, "INR")}
          </span>
          <Button disabled={pending} onClick={order}>
            {pending ? "Placing…" : "Place order"}
          </Button>
        </div>
      )}
      {result.error && <p className="mt-2 text-sm text-destructive">{result.error}</p>}
      {result.message && (
        <p className="mt-2 text-sm font-medium text-emerald-600">{result.message}</p>
      )}
    </div>
  );
}
