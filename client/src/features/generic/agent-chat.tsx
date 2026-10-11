import { Loader2, Send, Wrench } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mastraClient } from "@/mastra-client";

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "The agent request failed.";
}

type Message = {
  role: "user" | "assistant";
  content: string;
  tool?: string;
};

export type AgentChatProps = {
  id: string;
  title?: string;
  placeholder?: string;
  /** One-click prompts shown while the conversation is empty. */
  suggestions?: string[];
};

/** Streaming chat with any agent. Custom agent UIs can wrap this with their own props. */
export function AgentChat({
  id,
  title = "Chat",
  placeholder = "Send a message…",
  suggestions = [],
}: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Mutate the trailing assistant message in place as chunks arrive.
  const update = (apply: (draft: Message) => Message) =>
    setMessages((current) => {
      const next = [...current];
      next[next.length - 1] = apply(next[next.length - 1]!);
      return next;
    });

  // One chat turn. The reply streams into `messages`; the mutation tracks the
  // turn's pending / error state. Errors show in the chat, so no toast.
  const turn = useMutation({
    mutationKey: ["mastra", "agents", id, "stream"],
    meta: { toast: false },
    onMutate: (history: Message[]) => {
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
    },
    mutationFn: async (history: Message[]) => {
      const response = await mastraClient.getAgent(id).stream(
        history.map((message) =>
          message.role === "user"
            ? { role: "user" as const, content: message.content }
            : { role: "assistant" as const, content: message.content },
        ),
      );

      let streamError: string | null = null;
      await response.processDataStream({
        onChunk: (chunk) => {
          if (chunk.type === "text-delta") {
            update((draft) => ({ ...draft, content: draft.content + chunk.payload.text }));
          } else if (chunk.type === "tool-call") {
            update((draft) => ({ ...draft, tool: chunk.payload.toolName }));
          } else if (chunk.type === "error") {
            // Agent failures arrive as a chunk, not a rejected promise, so they
            // have to be surfaced here or the turn ends silently.
            streamError = describeError(chunk.payload.error);
          }
        },
      });
      if (streamError) throw new Error(streamError);
    },
    onError: () =>
      // Drop the empty placeholder so a failed turn can be retried cleanly.
      setMessages((current) =>
        current[current.length - 1]?.content === "" ? current.slice(0, -1) : current,
      ),
  });
  const busy = turn.isPending;
  const error = turn.isError ? describeError(turn.error) : null;

  function send(event?: React.FormEvent, text = input) {
    event?.preventDefault();
    const prompt = text.trim();
    if (!prompt || busy) return;
    turn.mutate([...messages, { role: "user", content: prompt }]);
  }

  return (
    <Card className="flex h-[min(70svh,720px)] min-h-96 flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <p className="text-muted-foreground text-sm">
                Start a conversation.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => send(undefined, suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  {message.tool && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Wrench className="size-3" />
                      called {message.tool}
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {message.content || (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
              <div ref={endRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter>
        <form onSubmit={send} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            disabled={busy}
            autoFocus
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
