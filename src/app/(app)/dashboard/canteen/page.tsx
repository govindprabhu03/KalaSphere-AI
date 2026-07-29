import Link from "next/link";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { toggleMenuItemAction, deleteMenuItemAction } from "@/lib/canteen/actions";
import { formatMoney } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MenuItemForm } from "./menu-form";

export const metadata = { title: "Canteen" };

export default async function CanteenPage() {
  const ctx = await requireContext();
  if (ctx.role !== "admin" && ctx.role !== "super_admin") redirect("/dashboard");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .eq("organization_id", ctx.activeOrgId!)
    .order("created_at", { ascending: false });
  const rows = items ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-semibold tracking-tight">Canteen menu</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          {rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No items yet.</Card>
          ) : (
            <div className="grid gap-3">
              {rows.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {!m.is_available && <Badge variant="outline">Hidden</Badge>}
                      </div>
                      {m.category && <p className="text-xs text-muted-foreground">{m.category}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatMoney(m.price_cents, "INR")}</span>
                      <form action={toggleMenuItemAction.bind(null, m.id, !m.is_available)}>
                        <Button size="xs" variant="outline" type="submit">
                          {m.is_available ? "Hide" : "Show"}
                        </Button>
                      </form>
                      <form action={deleteMenuItemAction.bind(null, m.id)}>
                        <Button size="xs" variant="ghost" type="submit">Delete</Button>
                      </form>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="py-5">
            <CardHeader>
              <CardTitle className="text-sm">Add menu item</CardTitle>
            </CardHeader>
            <CardContent>
              <MenuItemForm />
            </CardContent>
          </Card>
          <p className="mt-4 text-sm">
            <Link href="/dashboard/kitchen" className="text-primary hover:underline">
              Open kitchen board →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
