/**
 * Display helpers. Event date-times are stored WYSIWYG (the datetime-local the
 * admin typed is stored as-is), so we format in UTC to show exactly that.
 */
export function formatEventDateTime(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMoney(cents: number, currency = "INR"): string {
  if (cents <= 0) return "Free";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    cents / 100,
  );
}
