"use client";

import { useState, useTransition } from "react";
import { askAssistantAction } from "@/lib/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string };

export function AssistantChat() {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [pending, startTransition] = useTransition();

  function send() {
    const question = q.trim();
    if (!question || pending) return;
    setThread((t) => [...t, { role: "user", text: question }]);
    setQ("");
    startTransition(async () => {
      const r = await askAssistantAction(question);
      setThread((t) => [...t, { role: "ai", text: r.answer ?? r.error ?? "…" }]);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-40 flex-col gap-3">
        {thread.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about events, workshops or classes — e.g. &quot;What&apos;s happening this
            weekend?&quot; or &quot;Any tabla workshops?&quot;
          </p>
        )}
        {thread.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              m.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted whitespace-pre-wrap",
            )}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="self-start rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the assistant…" />
        <Button type="submit" disabled={pending}>Send</Button>
      </form>
    </div>
  );
}
