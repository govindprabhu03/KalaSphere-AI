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

export async function analyzeEventFeedbackAction(eventId: string): Promise<AiState> {
  const ctx = await getOptionalContext();
  if (!ctx) return { error: "Please log in." };
  if (ctx.role !== "admin" && ctx.role !== "super_admin") {
    return { error: "Only admins can analyse feedback." };
  }
  if (!isGeminiConfigured()) {
    return { error: "AI isn't configured (GEMINI_API_KEY)." };
  }

  const supabase = await createClient();
  // event_feedback is readable by org admins under RLS, scoped to this event.
  const { data: fb } = await supabase
    .from("event_feedback")
    .select("rating, comment")
    .eq("event_id", eventId);
  const rows = fb ?? [];
  if (rows.length === 0) return { error: "No feedback to analyse yet." };

  const avg = (rows.reduce((s, f) => s + f.rating, 0) / rows.length).toFixed(1);
  const lines = rows
    .map((f, i) => `${i + 1}. ${f.rating}/5${f.comment ? ` — "${f.comment}"` : ""}`)
    .join("\n");

  const system =
    "You help a cultural institution understand its event feedback. From the ratings " +
    "and comments below, write a short, warm summary for the organiser covering: overall " +
    "sentiment, what attendees liked, and what to improve. Use 3–5 concise bullet points. " +
    "Base everything ONLY on the feedback provided — never invent details.";
  const prompt = `Event feedback (${rows.length} responses, average ${avg}/5):\n${lines}`;

  try {
    const answer = await geminiGenerate(prompt, system);
    return { answer: answer || "Couldn't summarise the feedback." };
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
