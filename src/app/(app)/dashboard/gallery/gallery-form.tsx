"use client";

import { useActionState } from "react";
import { addGalleryAction, type ContentState } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GalleryForm() {
  const [state, action, pending] = useActionState(addGalleryAction, {} as ContentState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" placeholder="https://…" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="title">Caption</Label>
        <Input id="title" name="title" placeholder="Optional" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
