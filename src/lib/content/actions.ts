"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { fstr, slugify } from "@/lib/form-utils";

export type ContentState = { error?: string; message?: string };

async function requireAdminOrg() {
  const ctx = await getOptionalContext();
  if (!ctx) redirect("/login");
  if (!ctx.activeOrgId || (ctx.role !== "admin" && ctx.role !== "super_admin")) {
    redirect("/dashboard");
  }
  return ctx;
}

// ---- News ----
export async function createNewsAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const ctx = await requireAdminOrg();
  const title = fstr(fd, "title");
  if (!title) return { error: "Title is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("news_posts").insert({
    organization_id: ctx.activeOrgId!,
    slug: slugify(title, "news"),
    title,
    body: fstr(fd, "body"),
    cover_image_url: fstr(fd, "cover_image_url"),
    is_published: fd.get("publish") === "on",
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/news");
  return { message: `"${title}" created.` };
}

export async function setNewsPublishedAction(id: string, published: boolean) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase.from("news_posts").update({ is_published: published })
    .eq("id", id).eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/news");
}

export async function deleteNewsAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase.from("news_posts").delete().eq("id", id).eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/news");
}

// ---- Announcements ----
export async function createAnnouncementAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const ctx = await requireAdminOrg();
  const message = fstr(fd, "message");
  if (!message) return { error: "Message is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    organization_id: ctx.activeOrgId!,
    message,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/announcements");
  return { message: "Announcement posted." };
}

export async function deleteAnnouncementAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id).eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/announcements");
}

// ---- Gallery ----
export async function addGalleryAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const ctx = await requireAdminOrg();
  const url = fstr(fd, "image_url");
  if (!url) return { error: "Image URL is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").insert({
    organization_id: ctx.activeOrgId!,
    title: fstr(fd, "title"),
    image_url: url,
    created_by: ctx.user.id,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/gallery");
  return { message: "Added to gallery." };
}

export async function deleteGalleryAction(id: string) {
  const ctx = await requireAdminOrg();
  const supabase = await createClient();
  await supabase.from("gallery_items").delete().eq("id", id).eq("organization_id", ctx.activeOrgId!);
  revalidatePath("/dashboard/gallery");
}

// ---- Artist profile (own) ----
export async function upsertArtistProfileAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const ctx = await getOptionalContext();
  if (!ctx || !ctx.activeOrgId) redirect("/login");
  const stage = fstr(fd, "stage_name");
  if (!stage) return { error: "Stage name is required." };
  const supabase = await createClient();
  const { error } = await supabase.from("artist_profiles").upsert(
    {
      organization_id: ctx.activeOrgId,
      user_id: ctx.user.id,
      stage_name: stage,
      discipline: fstr(fd, "discipline"),
      bio: fstr(fd, "bio"),
      links: fstr(fd, "links"),
      is_public: fd.get("is_public") === "on",
    },
    { onConflict: "organization_id,user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/dashboard/community");
  return { message: "Profile saved." };
}
