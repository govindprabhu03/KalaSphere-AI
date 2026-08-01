"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr } from "@/lib/form-utils";

export type BrandingState = { error?: string; message?: string };

export async function updateBrandingAction(
  _p: BrandingState,
  fd: FormData,
): Promise<BrandingState> {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    return { error: "Only admins can change branding." };
  }

  const color = fstr(fd, "primary_color");
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { error: "Please choose a valid colour." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      logo_url: fstr(fd, "logo_url"),
      primary_color: color ?? "#6d28d9",
      tagline: fstr(fd, "tagline"),
    })
    .eq("id", ctx.activeOrgId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/branding");
  return { message: "Branding saved — your public site is updated." };
}
