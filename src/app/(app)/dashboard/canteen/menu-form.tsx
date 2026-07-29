"use client";

import { useActionState } from "react";
import { addMenuItemAction, type CanteenState } from "@/lib/canteen/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MenuItemForm() {
  const [state, action, pending] = useActionState(addMenuItemAction, {} as CanteenState);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Item name</Label>
        <Input id="name" name="name" placeholder="Masala chai" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" placeholder="Beverages" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="price">Price (₹)</Label>
        <Input id="price" name="price" type="number" min="0" defaultValue={0} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
