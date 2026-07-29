"use server";

import { createClient } from "@/lib/supabase/server";
import { getOptionalContext } from "@/lib/auth/context";
import { isGeminiConfigured, geminiGenerate } from "@/lib/ai/gemini";
import { formatEventDateTime, formatMoney } from "@/lib/format";

export type AiState = { error?: string; answer?: string };

export async function askAssistantAction(question: string): Promise<AiState> {
  const ctx = await getOptionalContext();
  if (!ctx) return { error: "Please log in." };
  if (!isGeminiConfigured()) {
    return { error: "AI isn't configured yet — add GEMINI_API_KEY to enable the assistant." };
  }
  if (!question.trim()) return { error: "Ask a question." };

  const org = ctx.activeOrgId;
  const supabase = await createClient();

  // All fetched under the caller's RLS — the model only sees what they can see.
  const [{ data: events }, { data: workshops }, { data: classes }] = await Promise.all([
    org
      ? supabase.from("events").select("title, starts_at, location_text, price_cents, category").eq("organization_id", org).eq("is_published", true)
      : Promise.resolve({ data: [] as never[] }),
    org
      ? supabase.from("workshops").select("title, starts_at, price_cents, category").eq("organization_id", org).eq("is_published", true)
      : Promise.resolve({ data: [] as never[] }),
    org
      ? supabase.from("classes").select("title, discipline, fee_cents").eq("organization_id", org).eq("is_published", true)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const context = [
    "EVENTS:",
    ...(events ?? []).map(
      (e) =>
        `- ${e.title} · ${formatEventDateTime(e.starts_at)}${e.location_text ? ` · ${e.location_text}` : ""} · ${formatMoney(e.price_cents)}${e.category ? ` · ${e.category}` : ""}`,
    ),
    "WORKSHOPS:",
    ...(workshops ?? []).map(
      (w) =>
        `- ${w.title}${w.starts_at ? ` · ${formatEventDateTime(w.starts_at)}` : ""} · ${formatMoney(w.price_cents)}${w.category ? ` · ${w.category}` : ""}`,
    ),
    "CLASSES:",
    ...(classes ?? []).map(
      (c) => `- ${c.title}${c.discipline ? ` (${c.discipline})` : ""} · ${formatMoney(c.fee_cents)}/month`,
    ),
  ].join("\n");

  const system =
    "You are the friendly assistant for a cultural institution on the KalaSphere platform. " +
    "Answer using ONLY the offerings listed below. Be concise and warm. If nothing matches, " +
    "say so and suggest checking back later. Never invent events, workshops, or classes.\n\n" +
    context;

  try {
    const answer = await geminiGenerate(question, system);
    return { answer: answer || "I couldn't find anything relevant to that." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

export async function generateEventDescriptionAction(
  title: string,
  category: string,
): Promise<AiState> {
  if (!isGeminiConfigured()) return { error: "AI isn't configured (GEMINI_API_KEY)." };
  if (!title.trim()) return { error: "Enter a title first." };
  try {
    const answer = await geminiGenerate(
      `Write an inviting 2–3 sentence description for a cultural event titled "${title}"${category ? ` in the "${category}" category` : ""}. Warm and concise. Return only the description text.`,
    );
    return { answer };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}
