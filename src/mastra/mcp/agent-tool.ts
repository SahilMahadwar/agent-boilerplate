import type { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Exposes an agent to MCP clients as an `ask_<key>` tool.
//
// MCPServer's own `agents` option builds that tool with a plain JSON Schema,
// which Mastra validates with Ajv. Ajv compiles schemas with `new Function`,
// which Workers forbid, so every call fails. A zod schema avoids that path.
export function agentTool(key: string, agent: Agent) {
  return createTool({
    id: `ask_${key}`,
    description: `Ask agent '${agent.name}' a question. Agent description: ${agent.getDescription()}`,
    inputSchema: z.object({
      message: z.string().describe("The question or input for the agent."),
    }),
    execute: async ({ message }, context) => {
      const result = await agent.generate(message, {
        requestContext: context?.requestContext,
      });
      return result.text;
    },
  });
}
