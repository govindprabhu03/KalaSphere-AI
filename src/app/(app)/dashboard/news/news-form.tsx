"use client";

import { useActionState } from "react";
import { createNewsAction, type ContentState } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";

export function NewsForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState(createNewsAction, {} as ContentState);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="grid gap-1.5">
        <Label>Cover image</Label>
        <ImageUpload name="cover_image_url" orgId={orgId} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="body">Body</Label>
        <textarea id="body" name="body" rows={5}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" className="size-4" /> Publish now
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Create post"}</Button>
    </form>
  );
}
