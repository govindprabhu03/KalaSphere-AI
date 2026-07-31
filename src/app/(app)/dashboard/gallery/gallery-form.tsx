"use client";

import { useActionState } from "react";
import { addGalleryAction, type ContentState } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/app/image-upload";

export function GalleryForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState(addGalleryAction, {} as ContentState);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label>Image</Label>
        <ImageUpload name="image_url" orgId={orgId} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="title">Caption</Label>
        <Input id="title" name="title" placeholder="Optional" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add to gallery"}</Button>
      </div>
    </form>
  );
}
