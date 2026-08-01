"use client";

import { useActionState } from "react";
import {
  updateBrandingAction,
  type BrandingState,
} from "@/lib/org/branding-actions";
import { ImageUpload } from "@/components/app/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandingForm({
  orgId,
  logoUrl,
  primaryColor,
  tagline,
}: {
  orgId: string;
  logoUrl?: string;
  primaryColor: string;
  tagline?: string;
}) {
  const [state, action, pending] = useActionState(
    updateBrandingAction,
    {} as BrandingState,
  );

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label>Logo</Label>
        <ImageUpload name="logo_url" orgId={orgId} defaultUrl={logoUrl} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={tagline}
          placeholder="A home for the arts in your city"
          maxLength={120}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="primary_color">Brand colour</Label>
        <div className="flex items-center gap-3">
          <input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue={primaryColor}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent"
          />
          <span className="text-sm text-muted-foreground">
            Used for accents across your public microsite.
          </span>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-600">{state.message}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save branding"}
        </Button>
      </div>
    </form>
  );
}
