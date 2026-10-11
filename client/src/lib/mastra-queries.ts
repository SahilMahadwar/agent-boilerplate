import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { mastraClient } from "@/mastra-client";

// Query and mutation options for the Mastra REST API (`/api/agents`, `/api/workflows`,
// `/api/tools`). Mastra's list endpoints key results by registration name; the
// UI addresses everything by `id`, which is what the per-item routes accept.

const withId = <T extends object>(record: Record<string, T>) =>
  Object.entries(record).map(([key, value]) => ({
    ...value,
    id: ("id" in value && typeof value.id === "string" ? value.id : key) as string,
  }));

export const agentsQuery = queryOptions({
  queryKey: ["mastra", "agents"],
  queryFn: async () => withId(await mastraClient.listAgents()),
});

export const agentQuery = (agentId: string) =>
  queryOptions({
    queryKey: ["mastra", "agents", agentId],
    queryFn: () => mastraClient.getAgent(agentId).details(),
  });

export const workflowsQuery = queryOptions({
  queryKey: ["mastra", "workflows"],
  queryFn: async () => withId(await mastraClient.listWorkflows()),
});

export const workflowQuery = (workflowId: string) =>
  queryOptions({
    queryKey: ["mastra", "workflows", workflowId],
    queryFn: () => mastraClient.getWorkflow(workflowId).details(),
  });

export const toolsQuery = queryOptions({
  queryKey: ["mastra", "tools"],
  queryFn: async () => withId(await mastraClient.listTools()),
});

export const toolQuery = (toolId: string) =>
  queryOptions({
    queryKey: ["mastra", "tools", toolId],
    queryFn: () => mastraClient.getTool(toolId).details(),
  });

/** Calls a tool directly, without an agent. */
export const executeToolMutation = (toolId: string) =>
  mutationOptions({
    mutationKey: ["mastra", "tools", toolId, "execute"],
    mutationFn: async (data: unknown) => {
      const output: unknown = await mastraClient.getTool(toolId).execute({ data });
      // Input validation failures come back as a 200 `{ error: true, message }`.
      if (output && typeof output === "object" && "error" in output && output.error === true) {
        throw new Error(String((output as { message?: unknown }).message ?? "Tool failed"));
      }
      return output;
    },
  });

/** Starts a workflow run and waits for it; rejects unless the run succeeds. */
export const runWorkflowMutation = (workflowId: string) =>
  mutationOptions({
    mutationKey: ["mastra", "workflows", workflowId, "run"],
    mutationFn: async (inputData: Record<string, unknown>) => {
      const run = await mastraClient.getWorkflow(workflowId).createRun();
      const result = await run.startAsync({ inputData });
      if (result.status === "failed") throw new Error(String(result.error));
      if (result.status !== "success") throw new Error(`Workflow run ${result.status}`);
      return result;
    },
  });

/** A successful workflow run, as returned by `runWorkflowMutation`. */
export type WorkflowRunResult = Awaited<
  ReturnType<NonNullable<ReturnType<typeof runWorkflowMutation>["mutationFn"]>>
>;

/** Mastra serializes zod schemas as JSON Schema strings; parse them for display. */
export function parseSchema(schema: unknown): JsonSchema | null {
  if (!schema) return null;
  if (typeof schema === "object") return schema as JsonSchema;
  try {
    const parsed = JSON.parse(String(schema));
    // Some versions wrap the schema as { json: ... } (superjson).
    return (parsed?.json ?? parsed) as JsonSchema;
  } catch {
    return null;
  }
}

export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
};

/** A starting value for a JSON input editor, built from the schema's properties. */
export function sampleFromSchema(schema: JsonSchema | null): unknown {
  if (!schema) return {};
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  switch (schema.type) {
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, value]) => [
          key,
          sampleFromSchema(value),
        ]),
      );
    case "array":
      return [];
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "string":
      return "";
    default:
      return null;
  }
}
