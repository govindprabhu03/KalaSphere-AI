"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to the org's orders over Supabase Realtime and refreshes the
 * server-rendered board whenever an order is placed or its status changes.
 * Renders a small live/connecting indicator. RLS still applies — only staff
 * (who can SELECT orders) receive events.
 */
export function KitchenRealtime({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`kitchen:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `organization_id=eq.${orgId}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`size-2 rounded-full ${
          live ? "bg-emerald-500" : "bg-muted-foreground/40"
        }`}
        aria-hidden
      />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}
