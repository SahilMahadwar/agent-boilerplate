import type { UseMutationResult } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { type FormEvent, useState } from "react";
import { JsonBlock } from "@/components/json-block";
import { ErrorState } from "@/components/query-states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseSchema, sampleFromSchema } from "@/lib/mastra-queries";

/**
 * JSON-in / JSON-out runner used by the generic workflow and tool views:
 * edit the input (prefilled from the input schema), run the mutation, show the
 * result. Create the mutation with `meta: { toast: false }`; errors show here.
 */
export function JsonRunner<TInput>({
  title,
  description,
  inputSchema,
  mutation,
}: {
  title: string;
  description?: string;
  inputSchema: unknown;
  mutation: UseMutationResult<unknown, Error, TInput>;
}) {
  const [input, setInput] = useState(() =>
    JSON.stringify(sampleFromSchema(parseSchema(inputSchema)), null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    let value: TInput;
    try {
      value = JSON.parse(input) as TInput;
    } catch {
      setParseError("Input must be valid JSON.");
      return;
    }
    setParseError(null);
    mutation.mutate(value);
  }

  return (
    <Card>
      <form onSubmit={submit} className="contents">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-32 font-mono text-xs"
            aria-label="Input JSON"
            aria-invalid={parseError ? true : undefined}
          />
          {parseError && <p className="text-destructive text-sm">{parseError}</p>}
          {mutation.isError && <ErrorState error={mutation.error} title="Run failed" />}
          {mutation.isSuccess && (
            <div className="grid gap-1">
              <p className="text-sm font-medium">Result</p>
              <JsonBlock value={mutation.data} />
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
            Run
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
