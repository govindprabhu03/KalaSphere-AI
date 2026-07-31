"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Uploads an image to the public "media" Supabase Storage bucket and exposes
 * its public URL through a hidden input, so the surrounding form submits the
 * URL to the existing server action unchanged.
 */
export function ImageUpload({ name, orgId }: { name: string; orgId: string }) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={url} />
      <input
        type="file"
        accept="image/*"
        onChange={onFile}
        className="text-sm file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs"
      />
      {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-24 rounded-lg border border-border/60 object-cover" />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
