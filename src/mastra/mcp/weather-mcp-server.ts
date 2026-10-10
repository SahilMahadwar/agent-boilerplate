import { MCPServer } from "@mastra/mcp";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";
import { weatherAgent } from "../agents/weather-agent";
import { weatherTool } from "../tools/weather-tool";
import { weatherWorkflow } from "../workflows/weather-workflow";
import { agentTool } from "./agent-tool";

// Everything listed here is exposed to MCP clients (ChatGPT, Claude, …) at
// `/api/mcp/weather-mcp/mcp`. Add or remove an entry to change what they see:
//   tools     → exposed under their key, as-is
//   agents    → add them to `tools` with `agentTool()`, exposed as `ask_<key>`
//               (not via the `agents` option, which fails on Workers; see agent-tool.ts)
//   workflows → exposed as `run_<key>`; the workflow needs a `description`
// See docs/mcp.md.
export const weatherMcpServer = new MCPServer({
  id: "weather-mcp",
  name: "Weather MCP",
  version: "1.0.0",
  description: "Weather forecasts and weather-based activity planning.",
  tools: {
    weatherTool,
    ask_weatherAgent: agentTool("weatherAgent", weatherAgent),
  },
  workflows: { weatherWorkflow },
  // Serves MCP 2026-07-28 natively, with a stateless fallback for clients that
  // still speak the 2025 protocol, on the same endpoint.
  protocolVersion: "2026-07-28",
  // The default (Ajv) compiles schemas with `new Function`, which Workers forbid.
  jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
});
