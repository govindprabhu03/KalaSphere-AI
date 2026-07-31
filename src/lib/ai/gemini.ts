/**
 * Minimal Google Gemini REST client (no SDK). Server-only.
 * Gated on GEMINI_API_KEY so the app runs without AI configured.
 * The AI only ever receives data the server already fetched under RLS — it
 * never queries the database or writes SQL.
 */
const MODEL = "gemini-flash-latest";

export function isGeminiConfigured(): boolean {
  const k = process.env.GEMINI_API_KEY ?? "";
  return k.length > 0 && !k.includes("REPLACE");
}

export async function geminiGenerate(prompt: string, system?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? "";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        // `gemini-flash-latest` is a thinking model: reasoning tokens are drawn
        // from the same budget as the visible answer (and can be several hundred
        // tokens), so keep this high enough that the answer isn't starved/truncated.
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}
