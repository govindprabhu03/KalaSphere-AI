"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CalendarBooking = {
  starts_at: string;
  ends_at: string;
  title: string;
};

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** UTC YYYY-MM-DD for an ISO datetime (matches the app's UTC display). */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Every YYYY-MM-DD a booking touches (inclusive; usually just one day). */
function bookingDays(b: CalendarBooking): string[] {
  const start = dayKey(b.starts_at);
  let endIso = b.ends_at || b.starts_at;
  // A booking ending exactly at midnight shouldn't spill onto the next day.
  const end = new Date(endIso);
  if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && dayKey(endIso) > start) {
    end.setUTCDate(end.getUTCDate() - 1);
    endIso = end.toISOString();
  }
  const endKey = dayKey(endIso);
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < 366 && dayKey(d.toISOString()) <= endKey; i++) {
    out.push(dayKey(d.toISOString()));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out.length ? out : [start];
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function MonthCalendar({
  bookings,
  emptyLabel = "Nothing booked this day — it's available.",
}: {
  bookings: CalendarBooking[];
  emptyLabel?: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [selected, setSelected] = useState<string | null>(
    today.toISOString().slice(0, 10),
  );

  // Map each YYYY-MM-DD -> bookings on that day.
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      for (const k of bookingDays(b)) {
        const list = m.get(k) ?? [];
        list.push(b);
        m.set(k, list);
      }
    }
    return m;
  }, [bookings]);

  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = today.toISOString().slice(0, 10);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }

  function shift(delta: number) {
    const m = month + delta;
    const y = year + Math.floor(m / 12);
    const nm = ((m % 12) + 12) % 12;
    setYear(y);
    setMonth(nm);
  }

  const selectedBookings = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-heading text-sm font-semibold">
          {MONTHS[month]} {year}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => {
              setYear(today.getUTCFullYear());
              setMonth(today.getUTCMonth());
              setSelected(todayKey);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Next month"
            onClick={() => shift(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {DOW.map((d, i) => (
          <div key={i} className="py-1 font-medium">
            {d}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const day = Number(key.slice(8));
          const has = byDay.has(key);
          const isToday = key === todayKey;
          const isSel = key === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(key)}
              className={[
                "relative aspect-square rounded-md text-sm transition-colors",
                isSel
                  ? "bg-primary text-primary-foreground"
                  : has
                    ? "bg-primary/10 text-foreground hover:bg-primary/20"
                    : "text-foreground hover:bg-muted",
                isToday && !isSel ? "ring-1 ring-primary/50" : "",
              ].join(" ")}
            >
              {day}
              {has && (
                <span
                  className={[
                    "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                    isSel ? "bg-primary-foreground" : "bg-primary",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        {selectedBookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="grid gap-2">
            {selectedBookings
              .slice()
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .map((b, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{b.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {fmtTime(b.starts_at)} – {fmtTime(b.ends_at)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
