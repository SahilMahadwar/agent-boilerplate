import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryFallback } from "@/components/query-states";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TargetSchedules } from "@/features/schedules/schedule-parts";
import {
  agentQuery,
  executeToolMutation,
  runWorkflowMutation,
  toolQuery,
  workflowQuery,
} from "@/lib/mastra-queries";
import type { ViewProps } from "../registry";
import { AgentChat } from "./agent-chat";
import { JsonRunner } from "./json-runner";
import { SchemaView } from "./schema-view";

// Fallback UIs for any agent, workflow or tool without an entry in
// features/registry.ts. Custom views can reuse these pieces.

const instructionsText = (instructions: unknown): string =>
  typeof instructions === "string"
    ? instructions
    : Array.isArray(instructions)
      ? instructions.map(instructionsText).join("\n\n")
      : instructions && typeof instructions === "object" && "content" in instructions
        ? String((instructions as { content: unknown }).content)
        : JSON.stringify(instructions, null, 2);

export function GenericAgentInteract({ id }: ViewProps) {
  return <AgentChat id={id} />;
}

export function GenericAgentConfigure({ id }: ViewProps) {
  const query = useQuery(agentQuery(id));
  if (!query.isSuccess) return <QueryFallback query={query} />;
  const agent = query.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            Configured in code, in <code>src/mastra/agents</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {[agent.provider, agent.modelId].filter(Boolean).join(" / ") || "unknown"}
          </Badge>
          {Object.keys(agent.tools ?? {}).map((tool) => (
            <Badge key={tool} variant="outline">
              tool: {tool}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">
            {instructionsText(agent.instructions)}
          </p>
        </CardContent>
      </Card>
      <TargetSchedules
        targetType="agent"
        targetId={id}
        defaults={{ name: `${agent.name} check-in`, input: { prompt: "" } }}
      />
    </div>
  );
}

export function GenericWorkflowInteract({ id }: ViewProps) {
  const query = useQuery(workflowQuery(id));
  const run = useMutation({ ...runWorkflowMutation(id), meta: { toast: false } });
  if (!query.isSuccess) return <QueryFallback query={query} />;

  return (
    <JsonRunner
      title="Run workflow"
      description="Starts a run and waits for the result."
      inputSchema={query.data.inputSchema}
      mutation={run}
    />
  );
}

export function GenericWorkflowConfigure({ id }: ViewProps) {
  const query = useQuery(workflowQuery(id));
  if (!query.isSuccess) return <QueryFallback query={query} />;
  const workflow = query.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {Object.entries(workflow.steps ?? {}).map(([stepId, step], index) => (
            <div key={stepId} className="flex gap-3 rounded-md border px-3 py-2">
              <span className="text-muted-foreground font-mono text-xs">{index + 1}</span>
              <div>
                <p className="font-mono text-sm">{stepId}</p>
                {step.description && (
                  <p className="text-muted-foreground text-xs">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <TargetSchedules targetType="workflow" targetId={id} />
      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaView schema={workflow.inputSchema} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaView schema={workflow.outputSchema} />
        </CardContent>
      </Card>
    </div>
  );
}

export function GenericToolInteract({ id }: ViewProps) {
  const query = useQuery(toolQuery(id));
  const execute = useMutation({ ...executeToolMutation(id), meta: { toast: false } });
  if (!query.isSuccess) return <QueryFallback query={query} />;

  return (
    <JsonRunner
      title="Execute tool"
      description={query.data.description}
      inputSchema={query.data.inputSchema}
      mutation={execute}
    />
  );
}

export function GenericToolConfigure({ id }: ViewProps) {
  const query = useQuery(toolQuery(id));
  if (!query.isSuccess) return <QueryFallback query={query} />;
  const tool = query.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaView schema={tool.inputSchema} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemaView schema={tool.outputSchema} />
        </CardContent>
      </Card>
    </div>
  );
}
