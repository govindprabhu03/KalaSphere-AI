import { Sparkles } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { Card } from "@/components/ui/card";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  await requireContext();
  const configured = isGeminiConfigured();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
        <Sparkles className="size-5 text-primary" /> AI Assistant
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ask about this organization&apos;s events, workshops and classes.
      </p>

      {!configured && (
        <Card className="mb-4 p-4 text-sm text-muted-foreground">
          AI isn&apos;t configured yet. Add <code>GEMINI_API_KEY</code> to{" "}
          <code>.env.local</code> to enable the assistant.
        </Card>
      )}

      <Card className="p-4">
        <AssistantChat />
      </Card>
    </div>
  );
}
