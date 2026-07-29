/** Small pure helpers shared by server actions (no "use server" — plain utils). */
export function fstr(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** datetime-local -> ISO. Stored WYSIWYG (treat input as UTC). */
export function toIso(local: string | null): string | null {
  return local ? new Date(local + "Z").toISOString() : null;
}

export function slugify(title: string, prefix = "item"): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || prefix}-${crypto.randomUUID().slice(0, 5)}`;
}
