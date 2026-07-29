"use client";

import { useActionState } from "react";
import { upsertArtistProfileAction, type ContentState } from "@/lib/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ArtistForm({
  defaults,
}: {
  defaults?: {
    stage_name?: string;
    discipline?: string;
    bio?: string;
    links?: string;
    is_public?: boolean;
  };
}) {
  const [state, action, pending] = useActionState(upsertArtistProfileAction, {} as ContentState);
  const d = defaults ?? {};
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="stage_name">Stage name</Label>
        <Input id="stage_name" name="stage_name" defaultValue={d.stage_name} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="discipline">Discipline</Label>
        <Input id="discipline" name="discipline" defaultValue={d.discipline} placeholder="Vocalist, Tabla…" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <textarea id="bio" name="bio" rows={4} defaultValue={d.bio}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="links">Links (website, socials)</Label>
        <Input id="links" name="links" defaultValue={d.links} placeholder="https://…" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" defaultChecked={d.is_public ?? true} className="size-4" />
        Show my profile in the public community
      </label>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  );
}
