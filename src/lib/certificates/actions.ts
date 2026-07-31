"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";

export type CertState = { error?: string; message?: string };

/**
 * Issue certificates to everyone who checked in to an event. Admin only.
 * Bound with the eventId: `issueEventCertificatesAction.bind(null, eventId)`.
 */
export async function issueEventCertificatesAction(
  eventId: string,
  _prev: CertState,
  fd: FormData,
): Promise<CertState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "admin" && ctx.role !== "super_admin") {
    return { error: "Only admins can issue certificates." };
  }

  const title =
    typeof fd.get("title") === "string" ? (fd.get("title") as string).trim() : "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_event_certificates", {
    p_event_id: eventId,
    p_title: title,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  const n = data ?? 0;
  return {
    message:
      n === 0
        ? "No new certificates — attendees may already have them, or no one has checked in yet."
        : `Issued ${n} certificate${n === 1 ? "" : "s"}.`,
  };
}
